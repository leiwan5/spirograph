import type { Bounds, DrawingMode, Transform } from './types.js';

/** Compute the joint bounding box of a set of curves */
export function computeBounds(curves: Array<{ points: Float64Array; count: number }>): Bounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const c of curves) {
    for (let i = 0; i < c.count; i++) {
      const x = c.points[2 * i];
      const y = c.points[2 * i + 1];
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  return { minX, minY, maxX, maxY };
}

/**
 * Bounding box for fixed-ring mode: determined only by the gear-ring geometry, completely independent of holes.
 * - inside: bounded by the ring gear radius R (pattern always stays inside the ring when hole ≤100%),
 *   the ring's pixel size on canvas is constant, independent of gear specs and hole.
 * - outside: bounded by the max pattern radius R + 2r (pattern never exceeds it when hole ≤100%).
 * Changing any pen's hole does not change the overall scale/position.
 */
export function computeFixedBounds(ringTeeth: number, rollingTeeth: number, mode: DrawingMode): Bounds {
  const maxR = mode === 'inside' ? ringTeeth : ringTeeth + rollingTeeth * 2;
  return { minX: -maxR, minY: -maxR, maxX: maxR, maxY: maxR };
}

/** Compute a uniform scaling transform (centered) from curve coordinates to canvas pixel coordinates */
export function computeTransform(bounds: Bounds, width: number, height: number, padding: number): Transform {
  const bw = bounds.maxX - bounds.minX;
  const bh = bounds.maxY - bounds.minY;
  if (bw <= 0 && bh <= 0) {
    return { scale: 1, offsetX: width / 2 - bounds.minX, offsetY: height / 2 - bounds.minY };
  }
  const scale = Math.min((width - padding * 2) / (bw || 1), (height - padding * 2) / (bh || 1));
  const offsetX = (width - bw * scale) / 2 - bounds.minX * scale;
  const offsetY = (height - bh * scale) / 2 - bounds.minY * scale;
  return { scale, offsetX, offsetY };
}

export function applyTransform(t: Transform, x: number, y: number): [number, number] {
  return [x * t.scale + t.offsetX, y * t.scale + t.offsetY];
}

/** Hole-pattern hole radius (px): based on the pitch-circle radius r and the scale, matching the pen hole's real position (hole%·r) */
export function gearHoleRadius(transform: Transform, rollingTeeth: number): number {
  return Math.max(1.2, 0.035 * rollingTeeth * transform.scale);
}
