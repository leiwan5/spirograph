// @spirograph/canvas — browser Canvas 2D glue for Spirograph (used by @spirograph/react & @spirograph/svelte)
// DOM-dependent rendering helper + export download glue on top of the pure @spirograph/core + @spirograph/anim
export { CanvasRenderer, makeAnimationFrame } from './renderer.js';
export type { RendererPen } from './renderer.js';
export { downloadBlob, exportPng, exportSvg, exportState } from './export.js';
