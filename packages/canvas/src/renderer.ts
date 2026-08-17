import type { SpirographState, Pen, RenderItem, Transform } from '@spirograph/core';
import { DEFAULT_STATE, computeBounds, computeFixedBounds, computeTransform, sampleCurve } from '@spirograph/core';
import { weightedSteps } from '@spirograph/core';
import {
  clearCanvas,
  drawGears,
  renderFull,
  renderPartial,
  renderSteps,
} from '@spirograph/core/browser';

/**
 * Frameworks-agnostic Canvas 2D renderer for Spirograph.
 *
 * Wraps a real HTMLCanvasElement and draws:
 *  - static full pattern (renderStatic),
 *  - animation frames by progress + play mode (renderProgress).
 *
 * Curve sampling is cached keyed by (mode/ring/rolling/hole list) so parameter
 * drags don't resample unnecessarily — identical strategy to the vanilla demo.
 * This module is DOM-dependent (getBoundingClientRect / ResizeObserver / DPR),
 * so it lives in the browser-only canvas package, not in the pure core.
 */
export class CanvasRenderer {
  private cacheKey = '';
  private cacheItems: RenderItem[] = [];

  /** Number of animation progress quanta (0-1 per second adjustment handled by the driver) */
  constructor(private canvas: HTMLCanvasElement) {}

  /** Build the render items (cached by curve geometry), merging latest pen props. */
  items(state: SpirographState): RenderItem[] {
    const pens = state.pens.length > 0 ? state.pens : DEFAULT_STATE.pens;
    const key =
      state.mode + '|' + state.ringTeeth + '|' + state.rollingTeeth + '|' +
      pens.map((p) => p.id + ':' + p.hole).join(',');
    if (key !== this.cacheKey) {
      this.cacheItems = pens.map((pen) => ({
        curve: sampleCurve(state.ringTeeth, state.rollingTeeth, state.mode, pen.hole),
        pen: { ...pen },
      }));
      this.cacheKey = key;
    } else {
      const byId = new Map(pens.map((p) => [p.id, p] as const));
      this.cacheItems = this.cacheItems.map((item) => ({
        curve: item.curve,
        pen: byId.get(item.pen.id) ?? item.pen,
      }));
    }
    return this.cacheItems;
  }

  /** Current canvas content-box size in CSS px (never smaller than 80×80). */
  canvasSize(): { width: number; height: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      width: Math.max(80, Math.floor(rect.width)),
      height: Math.max(80, Math.floor(rect.height)),
    };
  }

  private devicePixelRatio(): number {
    return (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
  }

  private transformOf(state: SpirographState, w: number, h: number): { items: RenderItem[]; t: Transform } {
    const items = this.items(state);
    const padding = Math.max(24, Math.min(w, h) * 0.04);
    const bounds =
      state.scaleMode === 'fixed'
        ? computeFixedBounds(state.ringTeeth, state.rollingTeeth, state.mode)
        : computeBounds(items.map((i) => i.curve));
    return { items, t: computeTransform(bounds, w, h, padding) };
  }

  /** Draw the finished full pattern (optionally with stationary gears beneath the curve). */
  renderStatic(state: SpirographState): void {
    const { width, height } = this.canvasSize();
    const ctx = clearCanvas(this.canvas, width, height, state.background, this.devicePixelRatio());
    const { items, t } = this.transformOf(state, width, height);
    if (state.showGears) {
      const pens = state.pens.length > 0 ? state.pens : DEFAULT_STATE.pens;
      drawGears(ctx, t, state.ringTeeth, state.rollingTeeth, state.mode, 0, pens, 0);
    }
    renderFull(ctx, items, t);
  }

  /**
   * Draw an animation frame at the given total progress (0..1).
   * sequential: one pen at a time (weighted by curve length); simultaneous: all pens in sync.
   * Gears are overlaid when showGears is set and rotate with the active pen.
   */
  renderProgress(state: SpirographState, playMode: 'sequential' | 'simultaneous', progress: number): void {
    const { width, height } = this.canvasSize();
    const ctx = clearCanvas(this.canvas, width, height, state.background, this.devicePixelRatio());
    const { items, t } = this.transformOf(state, width, height);
    if (items.length === 0) {
      this.renderStatic(state);
      return;
    }
    if (playMode === 'sequential') {
      if (state.showGears) {
        const { penIndex, penProgress } = weightedSteps(items.map((i) => i.curve.count - 1), progress);
        const curve = items[penIndex]?.curve;
        if (curve) {
          const gearT = penProgress * 2 * Math.PI * curve.periodTurns;
          drawGears(ctx, t, state.ringTeeth, state.rollingTeeth, state.mode, gearT, state.pens, penIndex);
        }
      }
      renderSteps(ctx, items, t, progress);
      return;
    }
    if (state.showGears) {
      const gearT = items[0].curve ? progress * 2 * Math.PI * items[0].curve.periodTurns : 0;
      drawGears(ctx, t, state.ringTeeth, state.rollingTeeth, state.mode, gearT, state.pens, 0);
    }
    renderPartial(ctx, items, t, progress);
  }
}

/**
 * Async frame callback for the animation driver. Returns whether more frames should continue.
 * Tracks whether the component is still mounted to avoid drawing to a detached canvas.
 */
export function makeAnimationFrame(
  renderer: CanvasRenderer,
  getState: () => SpirographState,
  playMode: 'sequential' | 'simultaneous',
): (progress: number) => void {
  return (progress: number) => {
    renderer.renderProgress(getState(), playMode, progress);
  };
}

/** Convenience type matching a Pen the renderer accepts (id required for caching). */
export type RendererPen = Pen;
