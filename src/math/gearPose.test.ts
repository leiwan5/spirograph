import { describe, it, expect } from 'vitest';
import { computeGearPose, computeSteps } from '../render/renderer';
import { sampleCurve } from '../math/curve';

describe('computeSteps（多笔分步）', () => {
  it('总进度映射到笔索引与笔内进度', () => {
    expect(computeSteps(3, 0).penIndex).toBe(0);
    expect(computeSteps(3, 0).penProgress).toBeCloseTo(0, 10);
    expect(computeSteps(3, 0.33).penIndex).toBe(0);
    expect(computeSteps(3, 0.33).penProgress).toBeCloseTo(0.99, 10);
    expect(computeSteps(3, 1 / 3).penIndex).toBe(1);
    expect(computeSteps(3, 1 / 3).penProgress).toBeCloseTo(0, 10);
    expect(computeSteps(3, 0.5).penIndex).toBe(1);
    expect(computeSteps(3, 0.5).penProgress).toBeCloseTo(0.5, 10);
    expect(computeSteps(3, 0.99).penIndex).toBe(2);
    expect(computeSteps(3, 0.99).penProgress).toBeCloseTo(0.97, 10);
    expect(computeSteps(3, 1).penIndex).toBe(2);
    expect(computeSteps(3, 1).penProgress).toBeCloseTo(1, 10);
    expect(computeSteps(1, 1).penIndex).toBe(0);
    expect(computeSteps(1, 1).penProgress).toBeCloseTo(1, 10);
  });
});

describe('computeGearPose（齿轮位姿）', () => {
  it('t=0 时孔位与曲线起点一致（内切）', () => {
    const R = 72, r = 30, d = 0.5 * r;
    const pose = computeGearPose(R, r, 'inside', 0);
    // 孔世界位置 = 中心(R−r, 0) + d*(cos spin, sin spin)
    const hx = (R - r) + d * Math.cos(pose.spinAngle);
    const hy = 0 + d * Math.sin(pose.spinAngle);
    const c = sampleCurve(R, r, 'inside', 50);
    expect(hx).toBeCloseTo(c.points[0], 10);
    expect(hy).toBeCloseTo(c.points[1], 10);
  });

  it('t=0 时孔位与曲线起点一致（外切）', () => {
    const R = 72, r = 30, d = 0.5 * r;
    const pose = computeGearPose(R, r, 'outside', 0);
    const hx = (R + r) + d * Math.cos(pose.spinAngle);
    const hy = d * Math.sin(pose.spinAngle);
    const c = sampleCurve(R, r, 'outside', 50);
    expect(hx).toBeCloseTo(c.points[0], 10);
    expect(hy).toBeCloseTo(c.points[1], 10);
  });

  it('自转角随 t 连续变化（无跳变）', () => {
    const pose1 = computeGearPose(72, 30, 'inside', 1.0);
    const pose2 = computeGearPose(72, 30, 'inside', 1.001);
    expect(Math.abs(pose2.spinAngle - pose1.spinAngle)).toBeLessThan(0.05);
    const e1 = computeGearPose(72, 30, 'outside', 2.0);
    const e2 = computeGearPose(72, 30, 'outside', 2.001);
    expect(Math.abs(e2.spinAngle - e1.spinAngle)).toBeLessThan(0.05);
  });
});
