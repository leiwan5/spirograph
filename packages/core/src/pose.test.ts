import { describe, it, expect } from 'vitest';
import { computeGearPose, computeSteps } from './pose.js';
import { gradientColorAt, lerpColor } from './gradient.js';
import { sampleCurve } from './math/curve.js';

describe('渐变颜色插值（间隔模型，闭合回环）', () => {
  // 颜色等距落在闭合区间点（间距 spacing%，第 1 色在 0 处），色用尽循环；
  // 曲线闭合：最后一格渐变回初始色（收笔衔接）。返回值统一为 rgb(...) 字符串。
  const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00']; // 红 绿 蓝 黄
  const spacing = 10;

  it('lerpColor 线性插值', () => {
    expect(lerpColor('#ff0000', '#0000ff', 0)).toBe('rgb(255,0,0)');
    expect(lerpColor('#ff0000', '#0000ff', 1)).toBe('rgb(0,0,255)');
    expect(lerpColor('#ff0000', '#0000ff', 0.5)).toBe('rgb(128,0,128)');
  });

  it('间隔点正好是设置的颜色（循环）', () => {
    expect(gradientColorAt(colors, 0.0, spacing)).toBe('rgb(255,0,0)');   // 0  → 红
    expect(gradientColorAt(colors, 0.1, spacing)).toBe('rgb(0,255,0)');   // 10 → 绿
    expect(gradientColorAt(colors, 0.2, spacing)).toBe('rgb(0,0,255)');   // 20 → 蓝
    expect(gradientColorAt(colors, 0.3, spacing)).toBe('rgb(255,255,0)'); // 30 → 黄
    expect(gradientColorAt(colors, 0.4, spacing)).toBe('rgb(255,0,0)');   // 40 → 循环回红
    expect(gradientColorAt(colors, 0.8, spacing)).toBe('rgb(255,0,0)');   // 80 → 红
    expect(gradientColorAt(colors, 0.9, spacing)).toBe('rgb(0,255,0)');   // 90 → 绿
  });

  it('闭合处（100%≡0%）渐变回初始色', () => {
    expect(gradientColorAt(colors, 1.0, spacing)).toBe('rgb(255,0,0)'); // 收笔 = 初始红
  });

  it('spacing 不整除 100 时末尾仍渐变回初始色', () => {
    expect(gradientColorAt(colors, 1.0, 30)).toBe('rgb(255,0,0)'); // 100 收笔回红
    expect(gradientColorAt(colors, 0.90, 30)).toBe('rgb(255,255,0)'); // 90 → 黄
  });

  it('段内整段渐变（中点）', () => {
    // [0,10)：红→绿；5% = (255,127,127)? 红(255,0,0)→绿(0,255,0) 中点 = (128,128,0)
    expect(gradientColorAt(colors, 0.05, spacing)).toBe('rgb(128,128,0)');
  });

  it('空 = 黑；单色 = 该色', () => {
    expect(gradientColorAt([], 0.5, spacing)).toBe('#000000');
    expect(gradientColorAt(['#123456'], 0.5, spacing)).toBe('#123456');
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
