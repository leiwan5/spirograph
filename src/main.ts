import './ui/styles.css';
import { buildPanel } from './ui/controls';
import { getState, subscribe } from './state/store';
import { sampleCurve } from './math/curve';
import {
  clearCanvas,
  computeBounds,
  computeFixedBounds,
  computeSteps,
  computeTransform,
  drawGears,
  renderFull,
  renderPartial,
  renderSteps,
} from './render/renderer';
import type { RenderItem } from './render/renderer';
import { exportPng, exportSvg } from './render/export';
import { DrawAnimation } from './anim/drawAnimation';
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
  const key =
    s.mode + '|' + s.ringTeeth + '|' + s.rollingTeeth + '|' +
    s.pens.map((p) => p.id + ':' + p.hole).join(',');
  if (key !== cacheKey) {
    cacheItems = s.pens.map((pen) => ({
      curve: sampleCurve(s.ringTeeth, s.rollingTeeth, s.mode, pen.hole),
      pen: { ...pen },
    }));
    cacheKey = key;
  } else {
    // 颜色/粗细可能已变：合并最新笔属性，曲线复用
    const byId = new Map(s.pens.map((p) => [p.id, p] as const));
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
  const ctx = clearCanvas(canvas, width, height, s.background);
  const { items, t } = computeTransformFor(width, height);
  (window as unknown as { __dshRender?: unknown }).__dshRender = {
    scaleMode: s.scaleMode,
    transform: t,
    bounds: items.length ? computeBounds(items.map((i) => i.curve)) : null,
  };
  if (s.showGears) {
    // 齿轮画在曲线之下：静态显示初始位姿
    drawGears(ctx, t, s.ringTeeth, s.rollingTeeth, s.mode, 0, s.pens, 0);
  }
  renderFull(ctx, items, t);
}

/** 计算当前进度下动画的 t 参数（用于齿轮位姿） */
function progressToT(progress: number, periodTurns: number): number {
  return progress * 2 * Math.PI * periodTurns;
}

function renderProgress(progress: number): void {
  const s = getState();
  const { width, height } = canvasSize();
  const ctx = clearCanvas(canvas, width, height, s.background);
  const { items, t } = computeTransformFor(width, height);
  if (s.showGears) {
    // 多笔分步：先画齿轮（当前笔的位姿），再画曲线
    const { penIndex, penProgress } = computeSteps(items.length, progress);
    const tParam = progressToT(penProgress, items[penIndex].curve.periodTurns);
    drawGears(ctx, t, s.ringTeeth, s.rollingTeeth, s.mode, tParam, s.pens, penIndex);
    renderSteps(ctx, items, t, progress);
  } else {
    renderPartial(ctx, items, t, progress);
  }
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
  anim = new DrawAnimation(
    renderProgress,
    () => {
      anim = null;
      panel.setPlayingUI(false);
      renderStatic();
    },
    15_000,
  );
  anim.setSpeed(s.speed);
  anim.start();
  panel.setPlayingUI(true, false);
}

// 参数变更 → 停止动画并重绘静态图；仅速度变更 → 只调速度
let prevSpeed = getState().speed;
subscribe(() => {
  const s = getState();
  if (s.speed !== prevSpeed) {
    prevSpeed = s.speed;
    if (anim) anim.setSpeed(s.speed);
    return;
  }
  if (anim) {
    anim.stop();
    anim = null;
    panel.setPlayingUI(false);
  }
  renderStatic();
});

panel.onPlayRequest(togglePlay);
panel.onRandomRequest(() => randomSettings());
panel.onExportPng(() => exportPng(buildItems(), getState().background));
panel.onExportSvg(() => exportSvg(buildItems(), getState().background));

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
