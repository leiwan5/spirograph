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

// Initialize state from URL params first (before buildPanel so controls show URL values)
applyUrlParams();

const root = document.getElementById('app')!;
const canvas = document.createElement('canvas');
canvas.id = 'canvas';
const panel = buildPanel(root, canvas);

// ---- Curve cache (re-sample only when hole/gear changes) ----
let cacheKey = '';
let cacheItems: RenderItem[] = [];

function buildItems(): RenderItem[] {
  const s = getState();
  // Guard: fall back to default pens if pens is unexpectedly empty so a curve can always be generated
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
    // Color/width may have changed: merge the latest pen properties, reuse the curve
    const byId = new Map(pens.map((p) => [p.id, p] as const));
    cacheItems = cacheItems.map((item) => ({
      curve: item.curve,
      pen: byId.get(item.pen.id) ?? item.pen,
    }));
  }
  return cacheItems;
}

// ---- Rendering ----
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
    // Gears drawn below the curve: statically show the initial pose
    const pens = s.pens.length > 0 ? s.pens : DEFAULT_STATE.pens;
    drawGears(ctx, t, s.ringTeeth, s.rollingTeeth, s.mode, 0, pens, 0);
  }
  renderFull(ctx, items, t);
}

// Play mode: one pen at a time (default) / all pens together
let playMode: 'simultaneous' | 'sequential' = 'sequential';

/** Render the current progress (animation frame): draw the curve per play mode, gears as an optional overlay */
function renderProgress(progress: number): void {
  const s = getState();
  const { width, height } = canvasSize();
  const ctx = clearCanvas(canvas, width, height, s.background, window.devicePixelRatio || 1);
  const { items, t } = computeTransformFor(width, height);
  if (items.length === 0) {
    // Guard: render the static image when there is nothing to draw, avoiding an out-of-bounds empty array
    renderStatic();
    return;
  }
  if (playMode === 'sequential') {
    // One pen at a time: draw one pen (weighted by curve length, true constant speed), then move to the next
    if (s.showGears) {
      const { penIndex, penProgress } = weightedSteps(items.map((i) => i.curve.count - 1), progress);
      const curve = items[penIndex]?.curve;
      if (curve) {
        // Gear follows the local progress of the active pen: the tooth tip moves/rotates in sync with the pen tip
        const gearT = penProgress * 2 * Math.PI * curve.periodTurns;
        drawGears(ctx, t, s.ringTeeth, s.rollingTeeth, s.mode, gearT, s.pens, penIndex);
      }
    }
    renderSteps(ctx, items, t, progress);
    return;
  }
  // All pens together: every pen draws in sync
  if (s.showGears) {
    // Gear rotates with the total progress of the reference pen (the first one)
    const gearT = items[0].curve ? progress * 2 * Math.PI * items[0].curve.periodTurns : 0;
    drawGears(ctx, t, s.ringTeeth, s.rollingTeeth, s.mode, gearT, s.pens, 0);
  }
  renderPartial(ctx, items, t, progress);
}

// ---- Animation ----
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
  // Base duration is computed dynamically from the total number of segments so stroke speed stays consistent (constant segments/second, independent of pattern complexity and pen count)
  const totalSegs = buildItems().reduce((n, i) => n + (i.curve.count - 1), 0);
  const SEGS_PER_SEC = 350; // constant per-pen drawing segment speed
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

// Parameter change → stop the animation and redraw the static image; speed/show-gears change → only adjust speed/update gears (don't interrupt the animation)
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
    // Gears are only an overlay and don't affect progress → don't stop the animation; it takes effect on the next frame
    return;
  }
  if (anim) {
    anim.stop();
    anim = null;
    panel.setPlayingUI(false);
  }
  renderStatic();
});

// Floating toolbar play button: shared togglePlay (play/pause/resume)
panel.onPlayRequest(togglePlay);
// Floating toolbar stop button: stop the animation and return to the static image
panel.onStopRequest(() => {
  if (anim) {
    anim.stop();
    anim = null;
  }
  panel.setPlayingUI(false);
  renderStatic();
});
// Play mode switch (all together / one at a time): only changes how the next frame is drawn, does not interrupt the animation
panel.onPlayModeChange((mode) => {
  playMode = mode;
});
panel.onRandomRequest(() => randomSettings());
panel.onExportPng((size) => exportPng(buildItems(), getState().background, size));
panel.onExportSvg((size) => exportSvg(buildItems(), getState().background, size));

// Any state change (including speed) → debounce-sync the address bar
subscribe(syncUrl);

// Initial render + window resize adaptation
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
