/** Gradient segment count: used uniformly by screen rendering, animation, export, and image endpoints so colors stay consistent everywhere */
export const GRADIENT_SEGMENTS = 128;

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/**
 * Parse a color string into RGB. Accepts either hex (`#rrggbb` / `rrggbb`) or the
 * `rgb(r,g,b)` form produced by gradient interpolation (gradientColorAt returns
 * `rgb(...)`, while solid pens and backgrounds are hex). Centralizes color parsing
 * so rasterization (PNG) accepts both forms.
 */
export function parseColor(c: string): [number, number, number] {
  if (c.startsWith('rgb(') || c.startsWith('RGB(')) {
    const m = c.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
    return [255, 0, 255]; // fallback magenta for malformed input
  }
  const h = c.replace('#', '');
  if (/^[0-9a-f]{6}$/i.test(h)) return hexToRgb(h);
  // short hex (#rgb)
  if (/^[0-9a-f]{3}$/i.test(h)) {
    return [
      parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16),
    ];
  }
  return [0, 0, 0]; // fallback black
}

/** RGB linear interpolation */
export function lerpColor(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return (
    'rgb(' +
    Math.round(ar + (br - ar) * t) + ',' +
    Math.round(ag + (bg - ag) * t) + ',' +
    Math.round(ab + (bb - ab) * t) + ')'
  );
}

/**
 * Interval gradient (closed loop): colors are spaced evenly along the curve (spacing %, the 1st color at 0), cycling once exhausted.
 * Each whole segment between two adjacent color points gradients from one end color to the other.
 * e.g. colors=[red,blue,green,orange], spacing=10:
 *   position 0/10/20/30/40/50... = red/blue/green/orange/red/blue...; [0,10)red→blue, [10,20)blue→green, ...
 * The curve is closed: at 100% it returns to 0% (start). So the last slot (last color point →100%)
 * gradients back to colors[0], guaranteeing a seamless pen-end join (the end color returns to the initial color, no jump).
 * Position p ∈ [k·spacing, (k+1)·spacing] takes the colors[k%n] → colors[(k+1)%n] gradient.
 */
export function gradientColorAt(colors: string[], t: number, spacing: number): string {
  const n = colors.length;
  if (n <= 0) return '#000000';
  if (n === 1) return colors[0];
  const s = Math.max(1, spacing); // spacing at least 1%
  const p = Math.min(100, Math.max(0, t * 100));

  // Color points distributed over the closed interval [0,100] = ceil(100/s); the last point is always < 100.
  // The slot-th point's position = slot*s, color = colors[slot % n].
  const lastIdx = Math.ceil(100 / s) - 1; // index of the last (pre-closure) color point
  const lastPos = lastIdx * s; // its position, always < 100
  const slot = Math.min(Math.floor(p / s), lastIdx);

  if (slot === lastIdx) {
    // The last pre-closure slot: gradient from the current position's color back to colors[0], span = 100 - lastPos
    const span = Math.max(1, 100 - lastPos);
    const local = Math.min(1, Math.max(0, (p - lastPos) / span));
    return lerpColor(colors[lastIdx % n], colors[0], local);
  }
  const c1 = colors[slot % n];
  const c2 = colors[(slot + 1) % n];
  const local = Math.min(1, Math.max(0, p / s - slot));
  return lerpColor(c1, c2, local);
}
