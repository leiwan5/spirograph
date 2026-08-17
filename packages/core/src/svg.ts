import type { RenderItem } from './types.js';
import { computeBounds, computeTransform } from './geometry.js';
import { buildRenderData } from './segments.js';

/** 每支笔导出点数上限（超出抽样），与旧版一致 */
const MAX_EXPORT_POINTS_PER_PEN = 12_000;

/**
 * 生成 SVG 文档字符串。尺寸 sizePx × sizePx，笔宽以 1000px 为基准按比例放大。
 * 颜色与 Canvas/PNG 同源（segmentColor），渐变逐段 path + 收笔线，保证无断裂。
 */
export function buildSvg(items: RenderItem[], background: string, sizePx = 2048): string {
  const bounds = computeBounds(items.map((i) => i.curve));
  const padding = sizePx * 0.04;
  const t = computeTransform(bounds, sizePx, sizePx, padding);

  // 单色笔大图抽样（每笔最多 ~12k 点）；渐变笔必须逐段全量（保证渐变连续）
  const decimate = items.map((item) => {
    if (item.pen.gradient.length > 1) return 1;
    const { count } = item.curve;
    return Math.max(1, Math.floor(count / MAX_EXPORT_POINTS_PER_PEN));
  });
  const data = buildRenderData(items, t, { decimate });

  const widthScale = sizePx / 1000;
  const pathEls: string[] = [];
  for (const pen of data.pens) {
    const w = (pen.width * widthScale).toFixed(2);
    if (pen.uniformColor !== null) {
      // 单色：一条连续 path（相邻段共享端点，曲线天然闭合——末点 = 首点）
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
      // 渐变：逐段 path（每段独立颜色），圆角 cap 共享顶点重叠，绝对无断裂
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
