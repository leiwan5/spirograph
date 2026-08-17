import type { CurveData, DrawingMode, GearRatio } from '../types.js';
import { meshPhase, reduceRatio, validateGears } from './gear.js';

/** Sample points per turn */
export const SAMPLES_PER_TURN = 1200;
/** Sample point cap for a single curve */
export const MAX_SAMPLES = 150_000;

export interface CurveInfo {
  ratio: GearRatio;
  periodTurns: number;
  totalSamples: number;
  reduced: boolean;
}

/** Compute only the gear info (no sampling), for the quick info-area display */
export function curveInfo(ringTeeth: number, rollingTeeth: number, mode: DrawingMode): CurveInfo {
  const invalid = validateGears(ringTeeth, rollingTeeth, mode);
  if (invalid) throw new Error(invalid);
  const { p, q } = reduceRatio(ringTeeth, rollingTeeth);
  const petals = mode === 'inside' ? p - q : p + q;
  const totalSamples = Math.ceil(q * SAMPLES_PER_TURN);
  return {
    ratio: { p, q, petals },
    periodTurns: q,
    totalSamples,
    reduced: totalSamples > MAX_SAMPLES,
  };
}

/**
 * Generate closed-curve sample points.
 *
 * inside (hypotrochoid):
 *   x = (R−r)cos t + d·cos((R−r)/r·t)，y = (R−r)sin t − d·sin((R−r)/r·t)
 * outside (epitrochoid):
 *   x = (R+r)cos t − d·cos((R+r)/r·t)，y = (R+r)sin t − d·sin((R+r)/r·t)
 *
 * Teeth share the same module so radii are proportional to tooth counts; teeth are used directly as R, r.
 * The closing period is T = 2π·q, where q = rollingTeeth/gcd.
 */
export function sampleCurve(
  ringTeeth: number,
  rollingTeeth: number,
  mode: DrawingMode,
  holePercent: number,
): CurveData {
  const info = curveInfo(ringTeeth, rollingTeeth, mode);
  const { p, q } = info.ratio;

  let samplesPerTurn = SAMPLES_PER_TURN;
  let total = info.totalSamples;
  if (info.reduced) {
    samplesPerTurn = Math.max(8, Math.floor(MAX_SAMPLES / q));
    total = samplesPerTurn * q;
  }

  const count = total + 1; // closing duplicate point at the end
  const pts = new Float64Array(count * 2);

  const R = ringTeeth;
  const r = rollingTeeth;
  const d = (holePercent / 100) * r;
  const a = mode === 'inside' ? R - r : R + r;
  const k = mode === 'inside' ? (R - r) / r : (R + r) / r;
  // inside: gear spin includes the mesh phase → the d-term phase of the hole trajectory = -meshPhase
  const phase = mode === 'inside' ? -meshPhase(R, r) : 0;
  const T = 2 * Math.PI * q;

  for (let i = 0; i <= total; i++) {
    const t = (i / total) * T;
    const c = Math.cos(t);
    const s = Math.sin(t);
    const kc = Math.cos(k * t + phase);
    const ks = Math.sin(k * t + phase);
    if (mode === 'inside') {
      pts[2 * i] = a * c + d * kc;
      pts[2 * i + 1] = a * s - d * ks;
    } else {
      pts[2 * i] = a * c - d * kc;
      pts[2 * i + 1] = a * s - d * ks;
    }
  }

  return {
    points: pts,
    count,
    ratio: { p, q, petals: info.ratio.petals },
    periodTurns: q,
    totalSamples: total,
    reduced: info.reduced,
  };
}
