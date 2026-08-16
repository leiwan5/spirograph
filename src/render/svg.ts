import type { Bounds, Transform } from '../types';
import type { RenderItem } from './renderer';
import { computeBounds, computeTransform, gradientColorAt, strokeGradientCurve } from './renderer';

/** 每支笔导出点数上限（超出抽样） */
const MAX_EXPORT_POINTS_PER_PEN = 12_000;

/**
 * 生成 SVG 文档字符串。尺寸 sizePx × sizePx，笔宽以 1000px 为基准按比例放大。
 */
export function buildSvg(items: RenderItem[], background: string, sizePx = 2048): string {
  const bounds = computeBounds(items.map((i) => i.curve));
  const padding = sizePx * 0.04;
  const t: Transform = computeTransform(bounds, sizePx, sizePx, padding);

  const strokeWidth = (item: RenderItem) => (item.pen.width * (sizePx / 1000)).toFixed(2);

  const pathEls: string[] = [];
  for (const item of items) {
    const { points, count } = item.curve;
    const w = strokeWidth(item);
    if (item.pen.gradient.length > 1) {
      // 渐变：逐点路径（每相邻两点一条 path，圆角 cap 在共享顶点重叠），
      // 保证与画布/导出 PNG 一样绝对无断裂。闭合处补一条收笔连线回起点。
      for (let i = 0; i + 1 < count; i++) {
        const prog = (i + 0.5) / Math.max(1, count - 1);
        const color = gradientColorAt(item.pen.gradient, prog, item.pen.gradientSpacing);
        const [x0, y0] = applySvgTransform(t, points[2 * i], points[2 * i + 1]);
        const [x1, y1] = applySvgTransform(t, points[2 * i + 2], points[2 * i + 3]);
        pathEls.push(
          `  <path d="M ${x0.toFixed(2)} ${y0.toFixed(2)} L ${x1.toFixed(2)} ${y1.toFixed(2)}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>`,
        );
      }
      // 收笔：最后一点 → 起点，闭合曲线，色渐变回初始色
      if (count > 0) {
        const [x0, y0] = applySvgTransform(t, points[2 * (count - 1)], points[2 * (count - 1) + 1]);
        const [x1, y1] = applySvgTransform(t, points[0], points[1]);
        const color = gradientColorAt(item.pen.gradient, 1, item.pen.gradientSpacing);
        pathEls.push(
          `  <path d="M ${x0.toFixed(2)} ${y0.toFixed(2)} L ${x1.toFixed(2)} ${y1.toFixed(2)}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>`,
        );
      }
      continue;
    }
    const step = Math.max(1, Math.floor(count / MAX_EXPORT_POINTS_PER_PEN));
    const n = Math.floor(count / step);
    let d = '';
    for (let i = 0; i < n; i++) {
      const idx = i * step;
      const [sx, sy] = applySvgTransform(t, points[2 * idx], points[2 * idx + 1]);
      d += (i === 0 ? 'M' : 'L') + sx.toFixed(2) + ' ' + sy.toFixed(2);
    }
    // 闭合回起点，保证 SVG 无缺口
    const [sx0, sy0] = applySvgTransform(t, points[0], points[1]);
    d += 'L' + sx0.toFixed(2) + ' ' + sy0.toFixed(2);
    pathEls.push(
      `  <path d="${d}" fill="none" stroke="${item.pen.color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`,
    );
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${sizePx}" height="${sizePx}" viewBox="0 0 ${sizePx} ${sizePx}">
  <rect width="100%" height="100%" fill="${background}"/>
${pathEls}
</svg>
`;
}

function applySvgTransform(t: Transform, x: number, y: number): [number, number] {
  return [x * t.scale + t.offsetX, y * t.scale + t.offsetY];
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function exportSvg(items: RenderItem[], background: string, sizePx = 2048, filename = 'spirograph.svg'): void {
  downloadBlob(new Blob([buildSvg(items, background, sizePx)], { type: 'image/svg+xml;charset=utf-8' }), filename);
}

export function exportPng(items: RenderItem[], background: string, sizePx = 2048, filename = 'spirograph.png'): void {
  const canvas = document.createElement('canvas');
  canvas.width = sizePx;
  canvas.height = sizePx;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, sizePx, sizePx);
  const bounds: Bounds = computeBounds(items.map((i) => i.curve));
  const padding = sizePx * 0.04;
  const t = computeTransform(bounds, sizePx, sizePx, padding);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const item of items) {
    const { points, count } = item.curve;
    const w = item.pen.width * (sizePx / 1000);
    if (item.pen.gradient.length > 1) {
      strokeGradientCurve(ctx, points, count, item.pen.gradient, item.pen.gradientSpacing, w, t);
      continue;
    }
    ctx.strokeStyle = item.pen.color;
    ctx.lineWidth = w;
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      const [sx, sy] = applySvgTransform(t, points[2 * i], points[2 * i + 1]);
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();
  }
  canvas.toBlob((blob) => {
    if (blob) downloadBlob(blob, filename);
  }, 'image/png');
}
