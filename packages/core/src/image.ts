import type { AppState, RenderItem } from './types.js';
import { DEFAULT_STATE } from './defaults.js';
import { parseState, getQueryValue } from './query.js';
import { sampleCurve } from './math/curve.js';
import { buildSvg } from './svg.js';
import { rasterize, encodePng } from './png.js';

export interface ImageParams {
  state: AppState;
  size: number;
}

/** Parse image params from a query string (same format as the frontend URL params) */
export function parseImageParams(search: string): ImageParams {
  const patch = parseState(search);
  const mode = patch.mode ?? DEFAULT_STATE.mode;
  const ring = patch.ringTeeth ?? DEFAULT_STATE.ringTeeth;
  let rolling = patch.rollingTeeth ?? DEFAULT_STATE.rollingTeeth;
  if (mode === 'inside' && rolling >= ring) rolling = ring - 1;
  const pens = patch.pens && patch.pens.length > 0 ? patch.pens : DEFAULT_STATE.pens;
  const state: AppState = {
    mode,
    ringTeeth: ring,
    rollingTeeth: rolling,
    pens: pens.map((p, i) => ({ id: i + 1, ...p })),
    background: patch.background ?? DEFAULT_STATE.background,
    speed: patch.speed ?? DEFAULT_STATE.speed,
    scaleMode: patch.scaleMode ?? DEFAULT_STATE.scaleMode,
    showGears: patch.showGears ?? DEFAULT_STATE.showGears,
  };
  // size param (default 1000, cap 4096)
  const sizeRaw = getQueryValue(search, 'size');
  const sizeNum = sizeRaw ? Number(sizeRaw) : NaN;
  const size = Number.isFinite(sizeNum) ? Math.min(4096, Math.max(64, Math.round(sizeNum))) : 1000;
  return { state, size };
}

/** Build render items (same curve-sampling logic as the frontend buildItems) */
export function buildItems(s: AppState): RenderItem[] {
  return s.pens.map((pen) => ({
    curve: sampleCurve(s.ringTeeth, s.rollingTeeth, s.mode, pen.hole),
    pen: { ...pen },
  }));
}

/** Generate an SVG string (pure string, no DOM) */
export function generateSvg(search: string): string {
  const { state, size } = parseImageParams(search);
  const items = buildItems(state);
  return buildSvg(items, state.background, size);
}

/**
 * Generate PNG bytes (Uint8Array): pure-JS pixel rendering + pako deflate encoding.
 * No Node-specific dependencies; runs in Node / browser / React Native / Vercel / Cloudflare Workers.
 */
export function generatePng(search: string): Uint8Array {
  const { state, size } = parseImageParams(search);
  const items = buildItems(state);
  const rgba = rasterize(items, state.background, size, {
    scaleMode: state.scaleMode,
    ringTeeth: state.ringTeeth,
    rollingTeeth: state.rollingTeeth,
    mode: state.mode,
  });
  return encodePng(size, size, rgba);
}
