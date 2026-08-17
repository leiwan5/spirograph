// Web 应用专属导出帮助函数（DOM 侧：Blob / URL / document）
// buildSvg / renderToCanvasAt 本体在 @spirograph/core，此处只做浏览器胶水。
import type { RenderItem } from '@spirograph/core';
import { buildSvg } from '@spirograph/core';
import { renderToCanvasAt } from '@spirograph/core/browser';
import type { CanvasElementLike } from '@spirograph/core/browser';

function downloadBlob(blob: Blob, filename: string): void {
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
  const createCanvas = (w: number, h: number): CanvasElementLike => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c as unknown as CanvasElementLike;
  };
  const canvas = renderToCanvasAt(items, background, sizePx, createCanvas);
  (canvas as unknown as HTMLCanvasElement).toBlob((blob) => {
    if (blob) downloadBlob(blob, filename);
  }, 'image/png');
}
