import { describe, it, expect } from 'vitest';
import { computeGearPose, computeSteps, weightedSteps } from './pose.js';
import { gradientColorAt, lerpColor } from './gradient.js';
import { sampleCurve } from './math/curve.js';

describe('gradient color interpolation (spacing model, closed loop)', () => {
  // colors spaced evenly on the closed interval points (spacing %, 1st color at 0), cycling once exhausted;
  // curve closes: the last slot fades back to the initial color (pen-end join). Return values are rgb(...) strings.
  const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00']; // red green blue yellow
  const spacing = 10;

  it('lerpColor linear interpolation', () => {
    expect(lerpColor('#ff0000', '#0000ff', 0)).toBe('rgb(255,0,0)');
    expect(lerpColor('#ff0000', '#0000ff', 1)).toBe('rgb(0,0,255)');
    expect(lerpColor('#ff0000', '#0000ff', 0.5)).toBe('rgb(128,0,128)');
  });

  it('spacing points are exactly the set colors (cycling)', () => {
    expect(gradientColorAt(colors, 0.0, spacing)).toBe('rgb(255,0,0)');   // 0  → red
    expect(gradientColorAt(colors, 0.1, spacing)).toBe('rgb(0,255,0)');   // 10 → green
    expect(gradientColorAt(colors, 0.2, spacing)).toBe('rgb(0,0,255)');   // 20 → blue
    expect(gradientColorAt(colors, 0.3, spacing)).toBe('rgb(255,255,0)'); // 30 → yellow
    expect(gradientColorAt(colors, 0.4, spacing)).toBe('rgb(255,0,0)');   // 40 → cycles back to red
    expect(gradientColorAt(colors, 0.8, spacing)).toBe('rgb(255,0,0)');   // 80 → red
    expect(gradientColorAt(colors, 0.9, spacing)).toBe('rgb(0,255,0)');   // 90 → green
  });

  it('fades back to the initial color at the closure (100%≡0%)', () => {
    expect(gradientColorAt(colors, 1.0, spacing)).toBe('rgb(255,0,0)'); // pen-end = initial red
  });

  it('when spacing does not divide 100, the end still fades back to the initial color', () => {
    expect(gradientColorAt(colors, 1.0, 30)).toBe('rgb(255,0,0)'); // 100 pen-end back to red
    expect(gradientColorAt(colors, 0.90, 30)).toBe('rgb(255,255,0)'); // 90 → yellow
  });

  it('whole-segment gradient within a segment (midpoint)', () => {
    // [0,10): red→green; 5% = (255,127,127)? red(255,0,0)→green(0,255,0) midpoint = (128,128,0)
    expect(gradientColorAt(colors, 0.05, spacing)).toBe('rgb(128,128,0)');
  });

  it('empty = black; solid = that color', () => {
    expect(gradientColorAt([], 0.5, spacing)).toBe('#000000');
    expect(gradientColorAt(['#123456'], 0.5, spacing)).toBe('#123456');
  });
});

describe('computeSteps (multi-pen steps)', () => {
  it('maps total progress to pen index and within-pen progress', () => {
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

describe('weightedSteps (curve-length-weighted true-speed steps)', () => {
  const counts = [100, 300, 100]; // total 500: pen1 (300/500=60% time, more strokes → more time)
  it('pens with more strokes take more time; progress is weighted by length', () => {
    // pen0 occupies [0,100/500)=[0,0.2)
    expect(weightedSteps(counts, 0.1).penIndex).toBe(0);
    expect(weightedSteps(counts, 0.1).penProgress).toBeCloseTo(0.5, 10); // 50/100
    // 0.2 → 100, enter pen1; pen1 occupies [0.2, 0.8)
    expect(weightedSteps(counts, 0.2).penIndex).toBe(1);
    expect(weightedSteps(counts, 0.2).penProgress).toBeCloseTo(0, 10);
    // 0.5 → 250, within pen1 (250-100)/300 = 0.5
    expect(weightedSteps(counts, 0.5).penIndex).toBe(1);
    expect(weightedSteps(counts, 0.5).penProgress).toBeCloseTo(0.5, 10);
    // pen2 occupies [0.8,1]
    expect(weightedSteps(counts, 0.85).penIndex).toBe(2);
    expect(weightedSteps(counts, 0.9).penProgress).toBeCloseTo(0.5, 10); // (450-400)/100
  });
  it('boundary: 0 → first pen 0; 1 → last pen 1', () => {
    expect(weightedSteps(counts, 0).penIndex).toBe(0);
    expect(weightedSteps(counts, 0).penProgress).toBe(0);
    expect(weightedSteps(counts, 1).penIndex).toBe(2);
    expect(weightedSteps(counts, 1).penProgress).toBe(1);
  });
  it('empty array returns (0,0)', () => {
    expect(weightedSteps([], 0.5)).toEqual({ penIndex: 0, penProgress: 0 });
  });
});

describe('computeGearPose (gear pose)', () => {
  it('the hole position coincides with the curve start at t=0 (inside)', () => {
    const R = 72, r = 30, d = 0.5 * r;
    const pose = computeGearPose(R, r, 'inside', 0);
    // hole world position = center(R−r, 0) + d*(cos spin, sin spin)
    const hx = (R - r) + d * Math.cos(pose.spinAngle);
    const hy = 0 + d * Math.sin(pose.spinAngle);
    const c = sampleCurve(R, r, 'inside', 50);
    expect(hx).toBeCloseTo(c.points[0], 10);
    expect(hy).toBeCloseTo(c.points[1], 10);
  });

  it('the hole position coincides with the curve start at t=0 (outside)', () => {
    const R = 72, r = 30, d = 0.5 * r;
    const pose = computeGearPose(R, r, 'outside', 0);
    const hx = (R + r) + d * Math.cos(pose.spinAngle);
    const hy = d * Math.sin(pose.spinAngle);
    const c = sampleCurve(R, r, 'outside', 50);
    expect(hx).toBeCloseTo(c.points[0], 10);
    expect(hy).toBeCloseTo(c.points[1], 10);
  });

  it('the spin angle varies continuously with t (no jumps)', () => {
    const pose1 = computeGearPose(72, 30, 'inside', 1.0);
    const pose2 = computeGearPose(72, 30, 'inside', 1.001);
    expect(Math.abs(pose2.spinAngle - pose1.spinAngle)).toBeLessThan(0.05);
    const e1 = computeGearPose(72, 30, 'outside', 2.0);
    const e2 = computeGearPose(72, 30, 'outside', 2.001);
    expect(Math.abs(e2.spinAngle - e1.spinAngle)).toBeLessThan(0.05);
  });
});
