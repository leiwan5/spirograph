import type { AppState, RenderItem } from '@spirograph/core';
import { buildSvg } from '@spirograph/core';
import { renderToCanvasAt } from '@spirograph/core/browser';
import type { CanvasElementLike } from '@spirograph/core/browser';

/** Trigger a browser download of a Blob. */
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

/** Download an SVG of the pattern at the given size. */
export function exportSvg(items: RenderItem[], background: string, sizePx = 2048, filename = 'spirograph.svg'): void {
  const svg = buildSvg(items, background, sizePx);
  downloadBlob(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), filename);
}

/** Download a high-resolution PNG of the pattern at the given size. */
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

/** Download exports keyed by rendering state (convenience for framework components). */
export function exportState(
  items: RenderItem[],
  state: AppState,
  format: 'png' | 'svg',
  sizePx = 2048,
): void {
  if (format === 'png') exportPng(items, state.background, sizePx);
  else exportSvg(items, state.background, sizePx);
}
