import '@fortawesome/fontawesome-free/css/fontawesome.min.css';
import '@fortawesome/fontawesome-free/css/solid.min.css';
import './ui/styles.css';
import { buildPanel } from './ui/controls';
import { getState, subscribe } from './state/store';
import { DEFAULT_STATE, computeBounds, computeFixedBounds, computeTransform, weightedSteps } from '@spirograph/core';
import { sampleCurve } from '@spirograph/core';
import type { RenderItem } from '@spirograph/core';
import { clearCanvas, drawGears, renderFull, renderPartial, renderSteps } from '@spirograph/core/browser';
import { exportPng, exportSvg } from './render/export';
import { DrawAnimation } from '@spirograph/anim';
import { randomSettings } from './ui/presets';
import { applyUrlParams, syncUrl } from './state/url';

// 先用 URL 参数初始化状态（必须在 buildPanel 之前，控件才能显示 URL 中的值）
applyUrlParams();

const root = document.getElementById('app')!;
const canvas = document.createElement('canvas');
canvas.id = 'canvas';
const panel = buildPanel(root, canvas);

// ---- 曲线缓存（仅孔洞/齿轮变化时重新采样） ----
let cacheKey = '';
let cacheItems: RenderItem[] = [];

function buildItems(): RenderItem[] {
  const s = getState();
  // 防御：pens 意外为空时回退默认笔，保证曲线永远可生成
  const pens = s.pens.length > 0 ? s.pens : DEFAULT_STATE.pens;
  const key =
    s.mode + '|' + s.ringTeeth + '|' + s.rollingTeeth + '|' +
    pens.map((p) => p.id + ':' + p.hole).join(',');
  if (key !== cacheKey) {
    cacheItems = pens.map((pen) => ({
      curve: sampleCurve(s.ringTeeth, s.rollingTeeth, s.mode, pen.hole),
      pen: { ...pen },
    }));
    cacheKey = key;
  } else {
    // 颜色/粗细可能已变：合并最新笔属性，曲线复用
    const byId = new Map(pens.map((p) => [p.id, p] as const));
    cacheItems = cacheItems.map((item) => ({
      curve: item.curve,
      pen: byId.get(item.pen.id) ?? item.pen,
    }));
  }
  return cacheItems;
}

// ---- 渲染 ----
function canvasSize(): { width: number; height: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    width: Math.max(80, Math.floor(rect.width)),
    height: Math.max(80, Math.floor(rect.height)),
  };
}

function computeTransformFor(w: number, h: number) {
  const s = getState();
  const items = buildItems();
  const padding = Math.max(24, Math.min(w, h) * 0.04);
  const bounds =
    s.scaleMode === 'fixed'
      ? computeFixedBounds(s.ringTeeth, s.rollingTeeth, s.mode)
      : computeBounds(items.map((i) => i.curve));
  return { items, t: computeTransform(bounds, w, h, padding) };
}

function renderStatic(): void {
  const s = getState();
  const { width, height } = canvasSize();
  const ctx = clearCanvas(canvas, width, height, s.background, window.devicePixelRatio || 1);
  const { items, t } = computeTransformFor(width, height);
  (window as unknown as { __dshRender?: unknown }).__dshRender = {
    scaleMode: s.scaleMode,
    transform: t,
    bounds: items.length ? computeBounds(items.map((i) => i.curve)) : null,
  };
  if (s.showGears) {
    // 齿轮画在曲线之下：静态显示初始位姿
    const pens = s.pens.length > 0 ? s.pens : DEFAULT_STATE.pens;
    drawGears(ctx, t, s.ringTeeth, s.rollingTeeth, s.mode, 0, pens, 0);
  }
  renderFull(ctx, items, t);
}

// 播放模式：单笔一次（默认） / 多笔同时
let playMode: 'simultaneous' | 'sequential' = 'sequential';

/** 渲染当前进度（动画帧）：按播放模式绘制曲线，齿轮为可选叠加 */
function renderProgress(progress: number): void {
  const s = getState();
  const { width, height } = canvasSize();
  const ctx = clearCanvas(canvas, width, height, s.background, window.devicePixelRatio || 1);
  const { items, t } = computeTransformFor(width, height);
  if (items.length === 0) {
    // 防御：无笔可画时直接渲染静态图，避免空数组越界
    renderStatic();
    return;
  }
  if (playMode === 'sequential') {
    // 单笔一次：一次画一支（按曲线长度加权，真实恒定速度），画完画下一支
    if (s.showGears) {
      const { penIndex, penProgress } = weightedSteps(items.map((i) => i.curve.count - 1), progress);
      const curve = items[penIndex]?.curve;
      if (curve) {
        // 齿轮跟随当前激活笔的局部进度：齿尖随笔尖同步移动/转动
        const gearT = penProgress * 2 * Math.PI * curve.periodTurns;
        drawGears(ctx, t, s.ringTeeth, s.rollingTeeth, s.mode, gearT, s.pens, penIndex);
      }
    }
    renderSteps(ctx, items, t, progress);
    return;
  }
  // 多笔同时：所有笔同步绘制
  if (s.showGears) {
    // 齿轮随基准笔（第一支）的总进度转动
    const gearT = items[0].curve ? progress * 2 * Math.PI * items[0].curve.periodTurns : 0;
    drawGears(ctx, t, s.ringTeeth, s.rollingTeeth, s.mode, gearT, s.pens, 0);
  }
  renderPartial(ctx, items, t, progress);
}

// ---- 动画 ----
let anim: DrawAnimation | null = null;

function togglePlay(): void {
  const s = getState();
  if (anim && anim.isRunning) {
    if (anim.isPaused) {
      anim.resume();
      panel.setPlayingUI(true, false);
    } else {
      anim.pause();
      panel.setPlayingUI(true, true);
    }
    return;
  }
  // 基准时长按总段数动态计算，保证"笔划速度一致"（恒定段/秒，与图形复杂度和笔数无关）
  const totalSegs = buildItems().reduce((n, i) => n + (i.curve.count - 1), 0);
  const SEGS_PER_SEC = 350; // 每笔恒定绘制段速
  const baseDurationMs = Math.max(1000, (totalSegs / SEGS_PER_SEC) * 1000);
  anim = new DrawAnimation(
    renderProgress,
    () => {
      anim = null;
      panel.setPlayingUI(false);
      renderStatic();
    },
    baseDurationMs,
  );
  anim.setSpeed(s.speed);
  anim.start();
  panel.setPlayingUI(true, false);
}

// 参数变更 → 停止动画并重绘静态图；速度/显示齿轮变更 → 只调速度/更新齿轮（不中断动画）
let prevSpeed = getState().speed;
let prevGears = getState().showGears;
subscribe(() => {
  const s = getState();
  if (s.speed !== prevSpeed) {
    prevSpeed = s.speed;
    if (anim) anim.setSpeed(s.speed);
    return;
  }
  if (s.showGears !== prevGears) {
    prevGears = s.showGears;
    // 齿轮仅叠加显示，不影响进度 → 不停止动画，下一帧自然生效
    return;
  }
  if (anim) {
    anim.stop();
    anim = null;
    panel.setPlayingUI(false);
  }
  renderStatic();
});

// 浮动工具栏播放按钮：共用 togglePlay（播放/暂停/恢复）
panel.onPlayRequest(togglePlay);
// 浮动工具栏停止按钮：停止动画并回静态图
panel.onStopRequest(() => {
  if (anim) {
    anim.stop();
    anim = null;
  }
  panel.setPlayingUI(false);
  renderStatic();
});
// 播放模式切换（多笔同时 / 单笔一次）：仅改下一帧绘制方式，不中断动画
panel.onPlayModeChange((mode) => {
  playMode = mode;
});
panel.onRandomRequest(() => randomSettings());
panel.onExportPng((size) => exportPng(buildItems(), getState().background, size));
panel.onExportSvg((size) => exportSvg(buildItems(), getState().background, size));

// 任何状态变化（含速度）→ 防抖同步地址栏
subscribe(syncUrl);

// 初始渲染 + 窗口缩放适配
renderStatic();
const ro = new ResizeObserver(() => {
  if (anim) {
    anim.stop();
    anim = null;
    panel.setPlayingUI(false);
  }
  renderStatic();
});
ro.observe(canvas);
