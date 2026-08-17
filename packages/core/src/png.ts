import { deflate } from 'pako';
import type { RenderItem } from './types.js';
import { computeBounds, computeFixedBounds, computeTransform } from './geometry.js';
import { parseColor } from './gradient.js';
import { buildRenderData, type BuildRenderDataOptions } from './segments.js';
import type { Transform } from './types.js';

/**
 * Rasterize: pattern + background → RGBA pixels (anti-aliased line drawing).
 * Colors share the same source (buildRenderData per-segment), consistent with Canvas/SVG.
 * With scaleMode='fixed' the fixed-ring bounding box is used (matching the frontend scale).
 */
export function rasterize(
  items: RenderItem[],
  background: string,
  size: number,
  opts: BuildRenderDataOptions & {
    scaleMode?: 'auto' | 'fixed';
    ringTeeth?: number;
    rollingTeeth?: number;
    mode?: 'inside' | 'outside';
  } = {},
): Uint8Array {
  const bounds =
    opts.scaleMode === 'fixed'
      ? computeFixedBounds(opts.ringTeeth!, opts.rollingTeeth!, opts.mode!)
      : computeBounds(items.map((i) => i.curve));
  const padding = size * 0.04;
  const t: Transform = computeTransform(bounds, size, size, padding);
  const data = buildRenderData(items, t, opts);

  const rgba = new Uint8Array(size * size * 4);
  const bg = parseColor(background);
  for (let i = 0; i < rgba.length; i += 4) {
    rgba[i] = bg[0];
    rgba[i + 1] = bg[1];
    rgba[i + 2] = bg[2];
    rgba[i + 3] = 255;
  }
  const widthScale = size / 1000;
  for (const s of data.segments) {
    plotLine(rgba, size, s.x0, s.y0, s.x1, s.y1, parseColor(s.color), s.width * widthScale);
  }
  return rgba;
}

/** Anti-aliased line drawing: the distance from the pixel center to the segment determines coverage (1px gradient edge) */
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

// ==================== PNG encoding (pako deflate, pure JS, no global encoder dependency) ====================
const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

/** PNG chunk types are always ASCII; hand-write the bytes to avoid depending on a global encoding API (Hermes/old RN lack it) */
function asciiBytes(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

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
  const typeBytes = asciiBytes(type);
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

/** RGBA pixels → PNG file bytes (filter=0 per row, deflate level 6) */
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
