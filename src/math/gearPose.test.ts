import { describe, it, expect } from 'vitest';
import { computeGearPose, computeSteps, gradientColorAt, lerpColor } from '../render/renderer';
import { sampleCurve } from '../math/curve';

describe('渐变颜色插值（定位断点）', () => {
  // 用户例子：0-10 纯色1，10-15 色1→色2，15-25 纯色2，25-30 色2→色3，30-40 纯色3，40+ 纯色3
  const stops = [
    { color: '#ff0000', pos: 15, trans: 5 },
    { color: '#00ff00', pos: 30, trans: 5 },
    { color: '#0000ff', pos: 40, trans: 0 },
  ];

  it('lerpColor 线性插值', () => {
    expect(lerpColor('#ff0000', '#0000ff', 0)).toBe('rgb(255,0,0)');
    expect(lerpColor('#ff0000', '#0000ff', 1)).toBe('rgb(0,0,255)');
    expect(lerpColor('#ff0000', '#0000ff', 0.5)).toBe('rgb(128,0,128)');
  });

  it('纯色区保持该断点颜色', () => {
    expect(gradientColorAt(stops, 0.02)).toBe('#ff0000'); // 2% 纯色1
    expect(gradientColorAt(stops, 0.1)).toBe('#ff0000'); // 10% 过渡起点仍纯色1
    expect(gradientColorAt(stops, 0.2)).toBe('#00ff00'); // 20% 纯色2
    expect(gradientColorAt(stops, 0.25)).toBe('#00ff00'); // 25% 过渡起点仍纯色2
    expect(gradientColorAt(stops, 0.35)).toBe('#0000ff'); // 35% 纯色3
    expect(gradientColorAt(stops, 0.9)).toBe('#0000ff'); // 90% 超过末断点 → 纯色3
  });

  it('过渡区线性插值到下一色', () => {
    expect(gradientColorAt(stops, 0.125)).toBe('rgb(128,128,0)'); // 12.5% 色1→色2 中点
    expect(gradientColorAt(stops, 0.15)).toBe('rgb(0,255,0)'); // 15% 过渡终点 = 色2
    expect(gradientColorAt(stops, 0.28)).toBe('rgb(0,102,153)'); // 28% 色2→色3 (u=0.6)
    expect(gradientColorAt(stops, 0.3)).toBe('rgb(0,0,255)'); // 30% = 色3
  });

  it('循环：末断点位置为周期，超过回首色', () => {
    expect(gradientColorAt(stops, 0.02, true)).toBe('#ff0000');
    expect(gradientColorAt(stops, 0.5, true)).toBe('#ff0000'); // t=50 → p=10 → 过渡起点
    expect(gradientColorAt(stops, 0.6, true)).toBe('#00ff00'); // t=60 → p=20 → 纯色2
    expect(gradientColorAt(stops, 0.9, true)).toBe('#ff0000'); // t=90 → p=10 → 色1区域
  });

  it('单断点 = 单色；空 = 黑', () => {
    expect(gradientColorAt([{ color: '#123456', pos: 100, trans: 0 }], 0.5)).toBe('#123456');
    expect(gradientColorAt([], 0.5)).toBe('#000000');
  });
});

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
