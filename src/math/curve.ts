import type { CurveData, DrawingMode, GearRatio } from '../types';
import { reduceRatio, validateGears } from './gear';

/** 每圈采样点数 */
export const SAMPLES_PER_TURN = 1200;
/** 单条曲线采样点上限 */
export const MAX_SAMPLES = 150_000;

export interface CurveInfo {
  ratio: GearRatio;
  periodTurns: number;
  totalSamples: number;
  reduced: boolean;
}

/** 只计算齿轮信息（不做采样），供信息区快速显示 */
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
 * 生成闭合曲线采样点。
 *
 * 内切（hypotrochoid）：
 *   x = (R−r)cos t + d·cos((R−r)/r·t)，y = (R−r)sin t − d·sin((R−r)/r·t)
 * 外切（epitrochoid）：
 *   x = (R+r)cos t − d·cos((R+r)/r·t)，y = (R+r)sin t − d·sin((R+r)/r·t)
 *
 * 齿数同模数，半径与齿数成正比，直接用齿数作为 R、r。
 * 闭合周期 T = 2π·q，其中 q = rollingTeeth/gcd。
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

  const count = total + 1; // 首尾闭合重复点
  const pts = new Float64Array(count * 2);

  const R = ringTeeth;
  const r = rollingTeeth;
  const d = (holePercent / 100) * r;
  const a = mode === 'inside' ? R - r : R + r;
  const k = mode === 'inside' ? (R - r) / r : (R + r) / r;
  const T = 2 * Math.PI * q;

  for (let i = 0; i <= total; i++) {
    const t = (i / total) * T;
    const c = Math.cos(t);
    const s = Math.sin(t);
    const kc = Math.cos(k * t);
    const ks = Math.sin(k * t);
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
