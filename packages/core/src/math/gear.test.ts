import { describe, it, expect } from 'vitest';
import { gcd, meshPhase, reduceRatio, petals, validateGears } from './gear.js';
import { sampleCurve, MAX_SAMPLES } from './curve.js';
import { computeFixedBounds, computeTransform } from '../geometry.js';

describe('gcd', () => {
  it('computes the greatest common divisor', () => {
    expect(gcd(72, 30)).toBe(6);
    expect(gcd(96, 63)).toBe(3);
    expect(gcd(60, 60)).toBe(60);
    expect(gcd(1, 1)).toBe(1);
    expect(gcd(0, 5)).toBe(5);
    expect(gcd(7, 13)).toBe(1);
  });
});

describe('reduceRatio', () => {
  it('reduces the teeth ratio', () => {
    expect(reduceRatio(72, 30)).toEqual({ p: 12, q: 5 });
    expect(reduceRatio(96, 63)).toEqual({ p: 32, q: 21 });
    expect(reduceRatio(144, 60)).toEqual({ p: 12, q: 5 });
    expect(reduceRatio(52, 30)).toEqual({ p: 26, q: 15 });
  });
});

describe('petals', () => {
  it('inside petal count = p − q', () => {
    expect(petals(72, 30, 'inside')).toBe(7);
    expect(petals(96, 63, 'inside')).toBe(11);
    expect(petals(52, 30, 'inside')).toBe(11);
    expect(petals(72, 24, 'inside')).toBe(2);
  });
  it('outside petal count = p + q', () => {
    expect(petals(72, 30, 'outside')).toBe(17);
    expect(petals(96, 63, 'outside')).toBe(53);
  });
});

describe('sampleCurve', () => {
  it('curve closes exactly at T = 2π·q', () => {
    const combos: Array<[number, number]> = [
      [72, 30], [96, 63], [144, 60], [52, 30], [120, 36], [40, 8], [96, 96 - 1],
    ];
    for (const [R, r] of combos) {
      for (const mode of ['inside', 'outside'] as const) {
        for (const hole of [0, 30, 100, 150]) {
          const c = sampleCurve(R, r, mode, hole);
          const n = c.count - 1;
          const dx = c.points[2 * n] - c.points[0];
          const dy = c.points[2 * n + 1] - c.points[1];
          expect(Math.hypot(dx, dy)).toBeLessThan(1e-9);
        }
      }
    }
  });

  it('degrades to a circle at d = 0', () => {
    const c = sampleCurve(72, 30, 'inside', 0);
    const radius = 72 - 30;
    for (let i = 0; i < c.count; i += 199) {
      const rr = Math.hypot(c.points[2 * i], c.points[2 * i + 1]);
      expect(Math.abs(rr - radius)).toBeLessThan(1e-9);
    }
    const e = sampleCurve(72, 30, 'outside', 0);
    const er = 72 + 30;
    for (let i = 0; i < e.count; i += 199) {
      const rr = Math.hypot(e.points[2 * i], e.points[2 * i + 1]);
      expect(Math.abs(rr - er)).toBeLessThan(1e-9);
    }
  });

  it('throws for inside mode with rolling teeth >= ring teeth', () => {
    expect(() => sampleCurve(60, 60, 'inside', 50)).toThrow();
    expect(() => sampleCurve(30, 60, 'inside', 50)).toThrow();
  });

  it('allows rolling teeth greater than ring teeth in outside mode', () => {
    expect(() => sampleCurve(30, 60, 'outside', 50)).not.toThrow();
  });

  it('respects the sampling cap', () => {
    // q = 239, 239×1200 = 286,800 > MAX_SAMPLES, so downsampling triggers
    const c = sampleCurve(240, 239, 'inside', 50);
    expect(c.count - 1).toBeLessThanOrEqual(MAX_SAMPLES);
    expect(c.reduced).toBe(true);
    const c2 = sampleCurve(72, 30, 'inside', 50);
    expect(c2.count - 1).toBe(5 * 1200);
    expect(c2.reduced).toBe(false);
  });

  it('closing turns = q', () => {
    expect(sampleCurve(72, 30, 'inside', 50).periodTurns).toBe(5);
    expect(sampleCurve(96, 63, 'inside', 50).periodTurns).toBe(21);
  });
});

describe('meshPhase (mesh phase)', () => {
  it('the rolling tooth tip polar angle aligns with the nearest ring valley center at t=0', () => {
    for (const [R, r] of [[72, 30], [72, 24], [96, 63], [40, 8], [240, 96], [52, 30]] as const) {
      const phase = meshPhase(R, r);
      const h = 0.2;
      // tooth tip direction relative to the rolling center
      const theta = phase + 0.5 * ((Math.PI * 2) / r);
      // tooth tip absolute position (rolling center at (R−r, 0))
      const px = R - r + (r + h) * Math.cos(theta);
      const py = (r + h) * Math.sin(theta);
      const angle = Math.atan2(py, px);
      // nearest ring valley center direction (j+1)·stepRing
      const stepRing = (Math.PI * 2) / R;
      const nearest = Math.round(angle / stepRing) * stepRing;
      expect(Math.abs(angle - nearest)).toBeLessThan(0.02);
    }
  });

  it('phase is bounded: |meshPhase| ≤ 0.5·stepRing + 0.5·stepRoll', () => {
    for (const [R, r] of [[72, 30], [72, 24], [96, 63], [40, 8], [240, 96]] as const) {
      const bound = 0.5 * ((Math.PI * 2) / R) + 0.5 * ((Math.PI * 2) / r);
      expect(Math.abs(meshPhase(R, r))).toBeLessThanOrEqual(bound + 1e-9);
    }
  });
});

describe('computeFixedBounds (fixed-ring scale)', () => {
  it('bounds depend only on the gear geometry, independent of holes', () => {
    // same gears, different holes → identical bounds and transform
    const b1 = computeFixedBounds(72, 30, 'inside');
    const b2 = computeFixedBounds(72, 30, 'inside');
    expect(b1).toEqual(b2);
    expect(computeTransform(b1, 800, 800, 32)).toEqual(computeTransform(b2, 800, 800, 32));
    // inside: bounded by the ring gear radius R
    expect(b1.maxX).toBe(72);
    expect(b1.minX).toBe(-72);
    // outside: bounded by the max pattern radius R + 2r
    const b3 = computeFixedBounds(72, 30, 'outside');
    expect(b3.maxX).toBe(72 + 60);
  });

  it('the ring pixel size on canvas is constant (does not change with gear specs)', () => {
    const t72 = computeTransform(computeFixedBounds(72, 30, 'inside'), 800, 800, 32);
    const t96 = computeTransform(computeFixedBounds(96, 63, 'inside'), 800, 800, 32);
    // ring radius × scale = constant pixels
    expect(72 * t72.scale).toBeCloseTo(96 * t96.scale, 10);
    // different gears, different holes → identical transform
    const t72b = computeTransform(computeFixedBounds(72, 30, 'inside'), 800, 800, 32);
    expect(t72).toEqual(t72b);
  });

  it('inside pattern always stays inside the ring when hole ≤100% (|point| ≤ R)', () => {
    for (const [R, r] of [[72, 30], [96, 63], [40, 8], [240, 96]] as const) {
      const c = sampleCurve(R, r, 'inside', 100);
      for (let i = 0; i < c.count; i += 97) {
        const dist = Math.hypot(c.points[2 * i], c.points[2 * i + 1]);
        expect(dist).toBeLessThanOrEqual(R + 1e-9);
      }
    }
  });

  it('bounds change when the gears change', () => {
    expect(computeFixedBounds(96, 63, 'inside').maxX).toBe(96);
    expect(computeFixedBounds(96, 63, 'inside').maxX).not.toBe(computeFixedBounds(72, 30, 'inside').maxX);
  });
});

describe('validateGears', () => {
  it('validates invalid input', () => {
    expect(validateGears(2.5, 30, 'inside')).not.toBeNull();
    expect(validateGears(60, 60, 'inside')).not.toBeNull();
    expect(validateGears(72, 30, 'inside')).toBeNull();
    expect(validateGears(30, 60, 'outside')).toBeNull();
  });
});
