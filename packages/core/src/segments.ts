import type { Pen, RenderData, RenderItem, RenderSegment, Transform } from './types.js';
import { gradientColorAt } from './gradient.js';

/**
 * The color of the i-th segment (of totalSegments) of a given pen.
 * Multi-color pen (colors.length ≥ 2): the gradient interpolated color at the segment midpoint progress (i+0.5)/N;
 * solid pen: colors[0]. This is the only color decision point across all platforms; SVG/PNG/Canvas/RN colors converge from this function.
 */
export function segmentColor(pen: Pen, segmentIndex: number, totalSegments: number): string {
  if (pen.colors.length > 1) {
    const t = (segmentIndex + 0.5) / Math.max(1, totalSegments);
    return gradientColorAt(pen.colors, t, pen.spacing);
  }
  return pen.colors[0];
}

/** Gradient closure-segment color: at the curve's closing point t=1 it fades back to the initial color (solid pen = colors[0]) */
export function closureColor(pen: Pen): string {
  return pen.colors.length > 1 ? gradientColorAt(pen.colors, 1, pen.spacing) : pen.colors[0];
}

export interface BuildRenderDataOptions {
  /** max segments to output per pen (not counting the gradient closure segment; used for animation prefix truncation), default all */
  perPenLimit?: number[];
  /** whether gradient pens get a closure segment (last point → start, closing the curve), default true; false while the animation is unfinished */
  closed?: boolean | boolean[];
  /** merge step: merge every d original segments into 1 (SVG large-image sampling/speed-up), global or per pen, default 1 */
  decimate?: number | number[];
}

/**
 * Build segment-level render data (unified render contract):
 * - coordinates already screen-transformed (transform scale + translate)
 * - colors already resolved: gradient per-segment + closure segment; solid pen uses uniform pen.color
 * - width = pen.width (screen pixels); the export side multiplies by the size ratio as needed
 */
export function buildRenderData(items: RenderItem[], transform: Transform, opts: BuildRenderDataOptions = {}): RenderData {
  const segments: RenderSegment[] = [];
  const pens: RenderData['pens'] = [];
  const { scale, offsetX, offsetY } = transform;
  const closedDefault = opts.closed === undefined ? true : opts.closed;

  for (let pi = 0; pi < items.length; pi++) {
    const item = items[pi];
    const { points, count } = item.curve;
    const totalSegs = Math.max(0, count - 1);
    const dec = Math.max(1, Math.floor(Array.isArray(opts.decimate) ? opts.decimate[pi] ?? 1 : opts.decimate ?? 1));
    const merged = Math.ceil(totalSegs / dec);
    const limit = Math.min(merged, opts.perPenLimit?.[pi] ?? merged);
    const isGradient = item.pen.colors.length > 1;
    const first = segments.length;

    for (let s = 0; s < limit; s++) {
      const i0 = s * dec;
      const i1 = Math.min(count - 1, i0 + dec);
      segments.push({
        x0: points[2 * i0] * scale + offsetX,
        y0: points[2 * i0 + 1] * scale + offsetY,
        x1: points[2 * i1] * scale + offsetX,
        y1: points[2 * i1 + 1] * scale + offsetY,
        color: segmentColor(item.pen, i0, totalSegs),
        width: item.pen.width,
      });
    }

    // gradient closure segment: only appended when the entire pen is drawn (limit reached) and closed
    const penClosed = Array.isArray(closedDefault) ? closedDefault[pi] ?? true : closedDefault;
    if (isGradient && penClosed && limit >= merged && count > 1) {
      const n = count - 1;
      segments.push({
        x0: points[2 * n] * scale + offsetX,
        y0: points[2 * n + 1] * scale + offsetY,
        x1: points[0] * scale + offsetX,
        y1: points[1] * scale + offsetY,
        color: closureColor(item.pen),
        width: item.pen.width,
      });
    }

    pens.push({
      first,
      count: segments.length - first,
      uniformColor: isGradient ? null : item.pen.colors[0],
      width: item.pen.width,
    });
  }
  return { segments, pens };
}
