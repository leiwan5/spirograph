import type { DrawingMode } from './types.js';
import { meshPhase } from './math/gear.js';

/** Gear pose: rolling-center direction angle + rolling gear spin angle */
export interface GearPose {
  centerAngle: number;
  spinAngle: number;
}

/**
 * Compute the rolling gear's pose at parameter t (pure rolling, curve coordinate unit = teeth).
 * inside: center on the (R−r) circle, spin = −(R−r)/r·t + mesh phase (tooth tip aligned to the ring valley)
 * outside: center on the (R+r) circle, spin = (R+r)/r·t + π
 */
export function computeGearPose(ringTeeth: number, rollingTeeth: number, mode: DrawingMode, t: number): GearPose {
  const k = mode === 'inside' ? (ringTeeth - rollingTeeth) / rollingTeeth : (ringTeeth + rollingTeeth) / rollingTeeth;
  return {
    centerAngle: t,
    spinAngle: mode === 'inside' ? -k * t + meshPhase(ringTeeth, rollingTeeth) : k * t + Math.PI,
  };
}

/** Multi-pen step progress: total progress [0,1] → current pen index + progress within that pen [0,1] */
export function computeSteps(penCount: number, totalProgress: number): { penIndex: number; penProgress: number } {
  const n = Math.max(1, penCount);
  const seg = 1 / n;
  const idx = Math.min(n - 1, Math.floor(totalProgress * n));
  const local = Math.min(1, (totalProgress - idx * seg) / seg);
  return { penIndex: idx, penProgress: local };
}

/**
 * Curve-length-weighted step progress (true speed): each pen's completion time is proportional to its curve segment count,
 * rather than dividing time slices equally among pens under a fixed total duration (otherwise pens with few strokes are too slow and pens with many are too fast).
 * counts = each pen's curve segment count (count-1 or totalSamples).
 */
export function weightedSteps(
  counts: number[],
  totalProgress: number,
): { penIndex: number; penProgress: number } {
  const total = counts.reduce((a, b) => a + Math.max(0, b), 0);
  if (total <= 0) return { penIndex: 0, penProgress: 0 };
  const target = Math.min(1, Math.max(0, totalProgress)) * total;
  let acc = 0;
  for (let i = 0; i < counts.length; i++) {
    const w = Math.max(0, counts[i]);
    if (acc + w > target) {
      return { penIndex: i, penProgress: Math.min(1, Math.max(0, (target - acc) / (w || 1))) };
    }
    acc += w;
  }
  return { penIndex: counts.length - 1, penProgress: 1 };
}
