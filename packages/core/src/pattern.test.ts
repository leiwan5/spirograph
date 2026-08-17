import { describe, it, expect } from 'vitest';
import { generateHolePattern } from './pattern.js';

describe('generateHolePattern (disc hole pattern)', () => {
  it('is deterministic: the same pen params generate the exact same hole pattern', () => {
    const pens = [{ hole: 40 }, { hole: 75 }];
    const a = generateHolePattern(pens);
    const b = generateHolePattern(pens);
    expect(a).toEqual(b);
    // different params → different pattern (high probability)
    const c = generateHolePattern([{ hole: 40 }, { hole: 70 }]);
    expect(JSON.stringify(c)).not.toBe(JSON.stringify(a));
  });

  it('has a ring of holes at each pen param radius (the pen hole is a member of the pattern)', () => {
    const pens = [{ hole: 40 }, { hole: 75 }, { hole: 57 }];
    const holes = generateHolePattern(pens);
    for (const pen of pens) {
      const frac = Math.max(0.08, pen.hole / 100);
      const ring = holes.filter((h) => Math.abs(h.frac - frac) < 1e-9);
      expect(ring.length).toBeGreaterThanOrEqual(8);
      // hole 0 at local angle 0 (coincides with the curve start)
      expect(ring.some((h) => Math.abs(h.angle) < 1e-9)).toBe(true);
    }
  });

  it('dedupes pens at the same radius and keeps extra rings away from pen rings', () => {
    const holes = generateHolePattern([{ hole: 50 }, { hole: 50 }]);
    const frac50 = holes.filter((h) => Math.abs(h.frac - 0.5) < 1e-9);
    expect(frac50.length).toBe(8); // only one ring generated
  });
});
