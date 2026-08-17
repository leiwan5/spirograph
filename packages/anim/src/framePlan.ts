import { computeSteps } from '@spirograph/core';
import type { RenderItem } from '@spirograph/core';

/** What to draw in a frame (pure data, consumed by the renderer) */
export interface FramePlan {
  /** the currently active pen index in step mode (-1 in parallel mode) */
  penIndex: number;
  /** progress within the current pen [0,1] (total progress in parallel mode) */
  penProgress: number;
  /** how many points each pen should draw (prefix truncation; = curve.count means fully drawn) */
  perPenPoints: number[];
  /** the current pen's curve parameter t (for the gear pose), 0 in parallel mode */
  gearT: number;
}

export interface FramePlanOptions {
  /** true=multi-pen step (current pen active, not-yet-started pens not drawn); false=parallel (all pens advance in sync) */
  step?: boolean;
}

/**
 * Compute how many points each pen draws at a given total progress (pure function, no timers).
 * - step mode: computeSteps decides the current pen; finished pens draw fully, not-yet-started ones draw nothing
 * - parallel mode: each pen advances in sync by its own count ratio
 */
export function createFramePlan(
  items: RenderItem[],
  progress: number,
  opts: FramePlanOptions = {},
): FramePlan {
  const counts = items.map((i) => i.curve.count);
  const totalPens = items.length;
  const p = Math.min(1, Math.max(0, progress));

  if (opts.step) {
    const { penIndex, penProgress } = computeSteps(totalPens, p);
    const perPenPoints = counts.map((c, i) => {
      if (i < penIndex) return c;
      if (i === penIndex) return Math.max(1, Math.floor(penProgress * c));
      return 0;
    });
    const curve = items[penIndex]?.curve;
    const gearT = curve ? penProgress * 2 * Math.PI * curve.periodTurns : 0;
    return { penIndex, penProgress, perPenPoints, gearT };
  }

  const perPenPoints = counts.map((c) => Math.max(1, Math.floor(p * c)));
  return { penIndex: -1, penProgress: p, perPenPoints, gearT: 0 };
}
