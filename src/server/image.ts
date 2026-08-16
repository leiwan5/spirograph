import { deflate } from 'pako';
import type { AppState } from '../types';
import { DEFAULT_STATE } from '../state/store';
import { parseState } from '../state/url';
import { sampleCurve } from '../math/curve';
import { computeBounds, computeFixedBounds, computeTransform, GRADIENT_SEGMENTS } from '../render/renderer';
import { buildSvg } from '../render/svg';

export interface ImageParams {
  state: AppState;
  size: number;
}

/** 从 query string 解析图片参数（格式与前端 URL 参数一致） */
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
  // size 参数（默认 1000，上限 4096）
  const sizeParam = new URLSearchParams(search).get('size');
  const sizeRaw = sizeParam ? Number(sizeParam) : NaN;
  const size = Number.isFinite(sizeRaw) ? Math.min(4096, Math.max(64, Math.round(sizeRaw))) : 1000;
  return { state, size };
}

/** 构造渲染条目（与前端 buildItems 相同的曲线采样逻辑） */
export function buildItems(s: AppState) {
  return s.pens.map((pen) => ({
    curve: sampleCurve(s.ringTeeth, s.rollingTeeth, s.mode, pen.hole),
    pen: { ...pen },
  }));
}

/** 生成 SVG 字符串（复用前端 svg.ts） */
export function generateSvg(search: string): string {
  const { state, size } = parseImageParams(search);
  const items = buildItems(state);
  return buildSvg(items, state.background, size);
}

/**
 * 生成 PNG 字节（Uint8Array）：纯 JS 像素渲染（抗锯齿画线）+ pako deflate 编码。
 * 无 Node 专属依赖，可运行于 Node / Vercel / Cloudflare Workers。
 */
export function generatePng(search: string): Uint8Array {
  const { state, size } = parseImageParams(search);
  const items = buildItems(state);
  const bounds =
    state.scaleMode === 'fixed'
      ? computeFixedBounds(state.ringTeeth, state.rollingTeeth, state.mode)
      : computeBounds(items.map((i) => i.curve));
  const padding = size * 0.04;
  const t = computeTransform(bounds, size, size, padding);

  const rgba = new Uint8Array(size * size * 4);
  const bg = hexToRgb(state.background);
  for (let i = 0; i < rgba.length; i += 4) {
    rgba[i] = bg[0];
    rgba[i + 1] = bg[1];
    rgba[i + 2] = bg[2];
    rgba[i + 3] = 255;
  }
  // 逐笔绘制曲线（后画覆盖先画，与前端一致；渐变笔按 GRADIENT_SEGMENTS 分段着色，与导出 PNG 颜色一致）
  for (const item of items) {
    const w = item.pen.width * (size / 1000); // 笔宽按导出基准放大
    const { points, count } = item.curve;
    const stops = item.pen.gradient;
    const hasGradient = stops.length > 1;
    const loop = item.pen.gradientLoop;
    const segLen = Math.max(1, Math.floor(Math.max(1, count - 1) / GRADIENT_SEGMENTS));
    for (let i = 0; i < count - 1; i++) {
      const x0 = points[2 * i] * t.scale + t.offsetX;
      const y0 = points[2 * i + 1] * t.scale + t.offsetY;
      const x1 = points[2 * i + 2] * t.scale + t.offsetX;
      const y1 = points[2 * i + 3] * t.scale + t.offsetY;
      const color = hasGradient
        ? gradientRgb(stops, (Math.floor(i / segLen) * segLen + segLen / 2) / Math.max(1, count - 1), loop)
        : hexToRgb(item.pen.color);
      plotLine(rgba, size, x0, y0, x1, y1, color, w);
    }
  }
  return encodePng(size, size, rgba);
}

/**
 * 多色渐变 → RGB 数组（与前端 gradientColorAt 同逻辑，直接数值插值，
 * 避免 rgb() 字符串经 hexToRgb 解析产生 NaN）。
 */
function gradientRgb(
  stops: Array<{ color: string; pos: number; trans: number }>,
  t: number,
  loop: boolean,
): [number, number, number] {
  const n = stops.length;
  if (n <= 0) return [0, 0, 0];
  if (n === 1) return hexToRgb(stops[0].color);
  let p = t * 100;
  if (loop) {
    const period = Math.max(stops[n - 1].pos, 1);
    p = ((p % period) + period) % period;
  }
  if (p <= stops[0].pos) return stopRgb(stops, 0, p);
  for (let i = 1; i < n - 1; i++) {
    if (p <= stops[i].pos) return stopRgb(stops, i, p);
  }
  return hexToRgb(stops[n - 1].color);
}

/** 第 i 个断点区间：末尾 trans 内过渡到下一个颜色 */
function stopRgb(
  stops: Array<{ color: string; pos: number; trans: number }>,
  i: number,
  p: number,
): [number, number, number] {
  const s = stops[i];
  const next = stops[i + 1];
  const transStart = s.pos - s.trans;
  if (p <= transStart) return hexToRgb(s.color);
  const u = s.trans <= 0 ? 1 : Math.min(1, Math.max(0, (p - transStart) / s.trans));
  const a = hexToRgb(s.color);
  const b = hexToRgb(next.color);
  return [
    Math.round(a[0] + (b[0] - a[0]) * u),
    Math.round(a[1] + (b[1] - a[1]) * u),
    Math.round(a[2] + (b[2] - a[2]) * u),
  ];
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** 抗锯齿画线：像素中心到线段距离决定覆盖度（1px 渐变边缘） */
function plotLine(
  data: Uint8Array,
  size: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: [number, number, number],
  width: number,
): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len2 = dx * dx + dy * dy;
  const half = width / 2;
  const minX = Math.max(0, Math.floor(Math.min(x0, x1) - half - 1));
  const maxX = Math.min(size - 1, Math.ceil(Math.max(x0, x1) + half + 1));
  const minY = Math.max(0, Math.floor(Math.min(y0, y1) - half - 1));
  const maxY = Math.min(size - 1, Math.ceil(Math.max(y0, y1) + half + 1));
  for (let py = minY; py <= maxY; py++) {
    for (let px = minX; px <= maxX; px++) {
      const cx = px + 0.5;
      const cy = py + 0.5;
      let d: number;
      if (len2 === 0) {
        d = Math.hypot(cx - x0, cy - y0);
      } else {
        let tt = ((cx - x0) * dx + (cy - y0) * dy) / len2;
        tt = tt < 0 ? 0 : tt > 1 ? 1 : tt;
        d = Math.hypot(cx - (x0 + tt * dx), cy - (y0 + tt * dy));
      }
      const alpha = Math.min(1, Math.max(0, half - d + 0.5));
      if (alpha <= 0) continue;
      const i = (py * size + px) * 4;
      data[i] = Math.round(color[0] * alpha + data[i] * (1 - alpha));
      data[i + 1] = Math.round(color[1] * alpha + data[i + 1] * (1 - alpha));
      data[i + 2] = Math.round(color[2] * alpha + data[i + 2] * (1 - alpha));
    }
  }
}

// ==================== PNG 编码（pako deflate，纯 JS） ====================
const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

let crcTableCache: number[] | null = null;
function crcTable(): number[] {
  if (crcTableCache) return crcTableCache;
  const table = new Array<number>(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  crcTableCache = table;
  return table;
}

function crc32(buf: Uint8Array): number {
  const table = crcTable();
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  out.set(typeBytes, 4);
  out.set(data, 8);
  const crcInput = new Uint8Array(4 + data.length);
  crcInput.set(typeBytes, 0);
  crcInput.set(data, 4);
  dv.setUint32(8 + data.length, crc32(crcInput));
  return out;
}

/** RGBA 像素 → PNG 文件字节（filter=0 每行，deflate level 6） */
export function encodePng(width: number, height: number, rgba: Uint8Array): Uint8Array {
  const stride = width * 4 + 1;
  const raw = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0;
    raw.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), y * stride + 1);
  }
  const idat = deflate(raw, { level: 6 });

  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, width);
  dv.setUint32(4, height);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const chunks = [PNG_SIGNATURE, pngChunk('IHDR', ihdr), pngChunk('IDAT', idat), pngChunk('IEND', new Uint8Array(0))];
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}
