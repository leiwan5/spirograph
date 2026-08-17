import type { RenderItem } from './types.js';
import { computeBounds, computeTransform } from './geometry.js';
import { buildRenderData } from './segments.js';

/** Max export points per pen (sampled beyond this), matching the legacy version */
const MAX_EXPORT_POINTS_PER_PEN = 12_000;

/**
 * Generate an SVG markup string. Size sizePx × sizePx, pen width scaled proportionally on a 1000px base.
 * Colors share the same source as Canvas/PNG (segmentColor); gradients use per-segment paths + a closure segment, guaranteeing no gaps.
 */
export function buildSvg(items: RenderItem[], background: string, sizePx = 2048): string {
  const bounds = computeBounds(items.map((i) => i.curve));
  const padding = sizePx * 0.04;
  const t = computeTransform(bounds, sizePx, sizePx, padding);

  // solid pens: sample large images (~12k points max per pen); gradient pens must be full per-segment (for continuous gradients)
  const decimate = items.map((item) => {
    if (item.pen.colors.length > 1) return 1;
    const { count } = item.curve;
    return Math.max(1, Math.floor(count / MAX_EXPORT_POINTS_PER_PEN));
  });
  const data = buildRenderData(items, t, { decimate });

  const widthScale = sizePx / 1000;
  const pathEls: string[] = [];
  for (const pen of data.pens) {
    const w = (pen.width * widthScale).toFixed(2);
    if (pen.uniformColor !== null) {
      // solid: one continuous path (adjacent segments share endpoints, the curve is naturally closed — last point = first point)
      let d = '';
      for (let i = pen.first; i < pen.first + pen.count; i++) {
        const s = data.segments[i];
        d += (i === pen.first ? 'M' : 'L') + s.x0.toFixed(2) + ' ' + s.y0.toFixed(2);
      }
      const last = data.segments[pen.first + pen.count - 1];
      d += 'L' + last.x1.toFixed(2) + ' ' + last.y1.toFixed(2);
      pathEls.push(
        `  <path d="${d}" fill="none" stroke="${pen.uniformColor}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`,
      );
    } else {
      // gradient: per-segment paths (each with its own color), rounded caps overlap at shared vertices, absolutely gap-free
      for (let i = pen.first; i < pen.first + pen.count; i++) {
        const s = data.segments[i];
        pathEls.push(
          `  <path d="M ${s.x0.toFixed(2)} ${s.y0.toFixed(2)} L ${s.x1.toFixed(2)} ${s.y1.toFixed(2)}" fill="none" stroke="${s.color}" stroke-width="${w}" stroke-linecap="round"/>`,
        );
      }
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${sizePx}" height="${sizePx}" viewBox="0 0 ${sizePx} ${sizePx}">
  <rect width="100%" height="100%" fill="${background}"/>
${pathEls.join('\n')}
</svg>
`;
}
