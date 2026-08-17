import type { DrawingMode } from './types.js';
import { meshPhase } from './math/gear.js';

/** 齿轮位姿：滚动中心方向角 + 滚动齿轮自转角 */
export interface GearPose {
  centerAngle: number;
  spinAngle: number;
}

/**
 * 计算滚动齿轮在参数 t 时刻的位姿（纯滚动，曲线坐标单位 = 齿数）。
 * 内切：中心在半径 (R−r) 圆上，自转角 = −(R−r)/r·t + 啮合相位（齿尖对准环齿谷）
 * 外切：中心在半径 (R+r) 圆上，自转角 = (R+r)/r·t + π
 */
export function computeGearPose(ringTeeth: number, rollingTeeth: number, mode: DrawingMode, t: number): GearPose {
  const k = mode === 'inside' ? (ringTeeth - rollingTeeth) / rollingTeeth : (ringTeeth + rollingTeeth) / rollingTeeth;
  return {
    centerAngle: t,
    spinAngle: mode === 'inside' ? -k * t + meshPhase(ringTeeth, rollingTeeth) : k * t + Math.PI,
  };
}

/** 多笔分步进度：总进度 [0,1] → 当前笔索引 + 该笔内进度 [0,1] */
export function computeSteps(penCount: number, totalProgress: number): { penIndex: number; penProgress: number } {
  const n = Math.max(1, penCount);
  const seg = 1 / n;
  const idx = Math.min(n - 1, Math.floor(totalProgress * n));
  const local = Math.min(1, (totalProgress - idx * seg) / seg);
  return { penIndex: idx, penProgress: local };
}

/**
 * 按曲线长度加权的分步进度（真实速度）：每支笔的完成时间与其曲线段数成正比，
 * 而不是固定总时长下各笔等分时间片（否则笔划少的太慢、笔划多的太快）。
 * counts = 各笔曲线段数（count-1 或 totalSamples）。
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
