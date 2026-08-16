import type { Bounds, Transform } from '../types';
import type { RenderItem } from './renderer';
import { computeBounds, computeTransform } from './renderer';

/** 每支笔导出点数上限（超出抽样） */
const MAX_EXPORT_POINTS_PER_PEN = 12_000;

/**
 * 生成 SVG 文档字符串。尺寸 sizePx × sizePx，笔宽以 1000px 为基准按比例放大。
 */
export function buildSvg(items: RenderItem[], background: string, sizePx = 2048): string {
  const bounds = computeBounds(items.map((i) => i.curve));
  const padding = sizePx * 0.04;
  const t: Transform = computeTransform(bounds, sizePx, sizePx, padding);

  const paths = items.map((item) => {
    const { points, count } = item.curve;
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
    return d;
  });

  const strokeWidth = (item: RenderItem) => (item.pen.width * (sizePx / 1000)).toFixed(2);

  const pathEls = items
    .map(
      (item, i) =>
        `  <path d="${paths[i]}" fill="none" stroke="${item.pen.color}" stroke-width="${strokeWidth(item)}" stroke-linecap="round" stroke-linejoin="round"/>`,
    )
    .join('\n');

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
    ctx.strokeStyle = item.pen.color;
    ctx.lineWidth = item.pen.width * (sizePx / 1000);
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
