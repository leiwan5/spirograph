/** A hole in the pattern (disc-local coords: frac = radius ratio, angle = local angle) */
export interface HolePatternHole {
  frac: number;
  angle: number;
}

/** Deterministic pseudo-random (seeded from pen params: same params → same hole pattern) */
function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Generate the disc hole pattern from pen params:
 * - a ring of holes at each pen's param radius (hole%·r), hole 0 at local angle 0 (strictly coincides with the curve start)
 *   → every pen's hole is a member of the pattern, the pen tip sits exactly in the middle of its hole
 * - then deterministically-random decorative rings so the face looks like a real spirograph drilling layout
 */
export function generateHolePattern(pens: Array<{ hole: number }>): HolePatternHole[] {
  const seed = pens.reduce((h, p) => h * 31 + Math.round(p.hole), 7) >>> 0;
  const rnd = seededRandom(seed);
  const holes: HolePatternHole[] = [];
  const usedFracs = new Set<number>();

  // pen-param rings: hole 0 at local angle 0
  for (const pen of pens) {
    const frac = Math.max(0.08, pen.hole / 100);
    if (usedFracs.has(frac)) continue;
    for (let k = 0; k < 8; k++) {
      holes.push({ frac, angle: (k / 8) * Math.PI * 2 });
    }
    usedFracs.add(frac);
  }

  // extra rings (decorative, random radius and hole count, avoiding being too close to existing rings)
  const target = Math.min(5, usedFracs.size + 2);
  let guard = 0;
  while (usedFracs.size < target && guard++ < 30) {
    const frac = 0.12 + rnd() * 0.76;
    if ([...usedFracs].some((f) => Math.abs(f - frac) < 0.14)) continue;
    const n = 7 + Math.floor(rnd() * 3);
    const offset = rnd() * ((Math.PI * 2) / n);
    for (let k = 0; k < n; k++) {
      holes.push({ frac, angle: offset + (k / n) * Math.PI * 2 });
    }
    usedFracs.add(frac);
  }
  return holes;
}
