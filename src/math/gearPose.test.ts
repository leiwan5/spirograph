import { describe, it, expect } from 'vitest';
import { computeGearPose, computeSteps, gradientColorAt, lerpColor } from '../render/renderer';
import { sampleCurve } from '../math/curve';

describe('渐变颜色插值', () => {
  it('lerpColor 线性插值', () => {
    expect(lerpColor('#ff0000', '#0000ff', 0)).toBe('rgb(255,0,0)');
    expect(lerpColor('#ff0000', '#0000ff', 1)).toBe('rgb(0,0,255)');
    expect(lerpColor('#ff0000', '#0000ff', 0.5)).toBe('rgb(128,0,128)');
  });

  it('gradientColorAt 多色渐变', () => {
    const colors = ['#ff0000', '#00ff00', '#0000ff'];
    expect(gradientColorAt(colors, 0)).toBe('rgb(255,0,0)');
    expect(gradientColorAt(colors, 0.5)).toBe('rgb(0,255,0)');
    expect(gradientColorAt(colors, 1)).toBe('rgb(0,0,255)');
    expect(gradientColorAt(colors, 0.25)).toBe('rgb(128,128,0)');
  });

  it('gradientColorAt 循环渐变：完成一轮回到首色（1/2/3/4/1/2/3/4...）', () => {
    const colors = ['#ff0000', '#00ff00', '#0000ff'];
    // length=0.5：每 0.5 完成一轮（1→2→3），然后回到首色循环
    expect(gradientColorAt(colors, 0.2, 0, 0.5, true)).toBe('rgb(51,204,0)'); // u=0.4
    expect(gradientColorAt(colors, 0.5, 0, 0.5, true)).toBe('rgb(255,0,0)'); // 一轮完成 → 循环回首色（u=0）
    expect(gradientColorAt(colors, 0.6, 0, 0.5, true)).toBe('rgb(153,102,0)'); // 第二轮 u=0.2 → seg=0.4
    expect(gradientColorAt(colors, 0.75, 0, 0.5, true)).toBe('rgb(0,255,0)'); // 第二轮 u=0.5 → seg=1 → 色2
    expect(gradientColorAt(colors, 0.99, 0, 0.5, true)).toBe('rgb(0,10,245)'); // 第二轮 u=0.98
    // 循环 + 起点：起点前纯首色，起点后循环
    expect(gradientColorAt(colors, 0.2, 0.3, 0.5, true)).toBe('#ff0000'); // t < start
    expect(gradientColorAt(colors, 0.3, 0.3, 0.5, true)).toBe('rgb(255,0,0)'); // 起点 u=0
    expect(gradientColorAt(colors, 0.55, 0.3, 0.5, true)).toBe('rgb(0,255,0)'); // 起点+0.25 → u=0.5 → 色2
    // 与不循环对比：t > start+length 后保持末色
    expect(gradientColorAt(colors, 0.9, 0.3, 0.5, false)).toBe('#0000ff');
  });

  it('gradientColorAt 起点/长度：前段纯首色、中段渐变、后段纯末色', () => {
    const colors = ['#ff0000', '#0000ff'];
    // t < start 返回原始首色；t > start+length 返回原始末色；之间返回插值 rgb
    expect(gradientColorAt(colors, 0, 0.3, 0.4)).toBe('#ff0000');
    expect(gradientColorAt(colors, 0.3, 0.3, 0.4)).toBe('rgb(255,0,0)'); // 渐变起点
    expect(gradientColorAt(colors, 0.5, 0.3, 0.4)).toBe('rgb(128,0,128)'); // 渐变中点
    expect(gradientColorAt(colors, 0.7, 0.3, 0.4)).toBe('rgb(0,0,255)'); // 渐变终点
    expect(gradientColorAt(colors, 0.9, 0.3, 0.4)).toBe('#0000ff');
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
