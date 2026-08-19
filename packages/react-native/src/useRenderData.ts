import { useMemo } from 'react';
import type { SpirographState, RenderItem, Transform, RenderData } from '@spirograph/core';
import {
  DEFAULT_STATE,
  sampleCurve,
  computeBounds,
  computeFixedBounds,
  computeTransform,
  weightedSteps,
  buildRenderData,
} from '@spirograph/core';

/** Compute RenderItems from state (cached by curve geometry) */
function computeItems(state: SpirographState): RenderItem[] {
  const pens = state.pens.length > 0 ? state.pens : DEFAULT_STATE.pens;
  return pens.map((pen) => ({
    curve: sampleCurve(state.ringTeeth, state.rollingTeeth, state.mode, pen.hole),
    pen: { ...pen },
  }));
}

/** Compute the Transform from items + viewport size */
function computeViewportTransform(
  items: RenderItem[],
  state: SpirographState,
  width: number,
  height: number,
): Transform {
  const padding = Math.max(24, Math.min(width, height) * 0.04);
  const bounds =
    state.scaleMode === 'fixed'
      ? computeFixedBounds(state.ringTeeth, state.rollingTeeth, state.mode)
      : computeBounds(items.map((i) => i.curve));
  return computeTransform(bounds, width, height, padding);
}

export interface RenderDataResult {
  /** The computed render data (segments + pen ranges) */
  renderData: RenderData;
  /** The transform used for rendering */
  transform: Transform;
  /** The computed render items (for gear rendering etc.) */
  items: RenderItem[];
}

/**
 * Hook: compute RenderData from SpirographState + viewport size.
 * Returns segments with screen-transformed coordinates and resolved colors,
 * ready for SVG rendering.
 *
 * @param state - The spirograph drawing state
 * @param width - Viewport width in dp
 * @param height - Viewport height in dp
 * @param progress - Animation progress (0..1), default 1 (full render)
 * @param playMode - 'sequential' (one pen at a time) or 'simultaneous' (all pens together)
 */
export function useRenderData(
  state: SpirographState,
  width: number,
  height: number,
  progress = 1,
  playMode: 'sequential' | 'simultaneous' = 'sequential',
): RenderDataResult {
  return useMemo(() => {
    const items = computeItems(state);
    const transform = computeViewportTransform(items, state, width, height);

    // Full render: no limits, closed curve
    if (progress >= 1) {
      const renderData = buildRenderData(items, transform);
      return { renderData, transform, items };
    }

    // Partial render: compute per-pen limits based on progress + playMode
    const totalSamples = items.map((i) => Math.max(0, i.curve.count - 1));
    let perPenLimit: number[];
    let closed: boolean[];

    if (playMode === 'sequential') {
      // Sequential: one pen at a time, weighted by curve length
      const { penIndex, penProgress } = weightedSteps(totalSamples, progress);
      perPenLimit = totalSamples.map((count, i) => {
        if (i < penIndex) return count; // fully drawn
        if (i === penIndex) return Math.max(1, Math.floor(penProgress * count)); // partial
        return 0; // not started
      });
      // Only the last fully-drawn pen gets a closure; active pen is partial
      closed = totalSamples.map((_, i) => i < penIndex);
    } else {
      // Simultaneous: all pens advance together
      perPenLimit = totalSamples.map((count) => Math.max(1, Math.floor(progress * count)));
      closed = [false]; // no closure during animation
    }

    const renderData = buildRenderData(items, transform, {
      perPenLimit,
      closed,
    });

    return { renderData, transform, items };
  }, [state, width, height, progress, playMode]);
}

/**
 * Compute gear pose parameters for SVG gear rendering.
 * Returns the gear positions/rotations needed to draw gears at a given animation progress.
 */
export function computeGearDrawParams(
  items: RenderItem[],
  progress: number,
  playMode: 'sequential' | 'simultaneous',
): { gearAngle: number; activePenIndex: number } {
  if (items.length === 0) return { gearAngle: 0, activePenIndex: 0 };

  const totalSamples = items.map((i) => Math.max(0, i.curve.count - 1));

  if (playMode === 'sequential') {
    const { penIndex, penProgress } = weightedSteps(totalSamples, progress);
    const curve = items[penIndex]?.curve;
    const gearAngle = curve ? penProgress * 2 * Math.PI * curve.periodTurns : 0;
    return { gearAngle, activePenIndex: penIndex };
  }

  // Simultaneous: all pens draw together, use first pen's curve for gear angle
  const curve = items[0]?.curve;
  const gearAngle = curve ? progress * 2 * Math.PI * curve.periodTurns : 0;
  return { gearAngle, activePenIndex: 0 };
}
