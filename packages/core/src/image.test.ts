import { describe, it, expect } from 'vitest';
import { generatePng, generateSvg } from './image.js';
import { encodePng } from './png.js';
import { parseState, buildItems, rasterize } from './index.js';

describe('server-side image generation (deployed endpoint reuse)', () => {
  it('encodePng outputs a valid PNG signature', () => {
    const rgba = new Uint8Array(64 * 64 * 4).fill(255);
    const png = encodePng(64, 64, rgba);
    expect(png[0]).toBe(137);
    expect(png[1]).toBe(80);
    expect(png[2]).toBe(78);
    expect(png[3]).toBe(71);
    // IHDR dimensions
    const dv = new DataView(png.buffer, 16, 8);
    expect(dv.getUint32(0)).toBe(64);
    expect(dv.getUint32(4)).toBe(64);
  });

  it('generatePng outputs a valid PNG (default params)', () => {
    const png = generatePng('?ring=72&rolling=30&pen=40,2.5,e63946&pen=75,2,1d6fa5');
    expect(png[0]).toBe(137);
    const dv = new DataView(png.buffer, 16, 8);
    expect(dv.getUint32(0)).toBe(1000);
    expect(dv.getUint32(4)).toBe(1000);
  });

  it('generatePng supports the size param and clamps', () => {
    expect(new DataView(generatePng('?size=512').buffer, 16, 4).getUint32(0)).toBe(512);
    expect(new DataView(generatePng('?size=99999').buffer, 16, 4).getUint32(0)).toBe(4096);
  });

  it('generateSvg outputs an SVG document', () => {
    const svg = generateSvg('?ring=72&rolling=30&pen=40,2.5,e63946');
    expect(svg.startsWith('<?xml')).toBe(true);
    expect(svg).toContain('<svg');
    expect(svg).toContain('stroke="#e63946"');
  });

  it('falls back to defaults for invalid params', () => {
    const png = generatePng('?ring=abc&rolling=999&pen=bad');
    expect(new DataView(png.buffer, 16, 4).getUint32(0)).toBe(1000);
  });

  it('gradient pens also output a valid PNG (uniform per-segment coloring)', () => {
    const png = generatePng('?pen=40,2.5,e63946,10,1d6fa5,f4a261');
    expect(png[0]).toBe(137);
    const dv = new DataView(png.buffer, 16, 4);
    expect(dv.getUint32(0)).toBe(1000);
  });
});

describe('gradient color rasterization (parseColor in PNG renderer)', () => {
  it('rasterize resolves gradient (rgb(...)) segment colors to the correct RGB, not NaN/black', () => {
    const items = buildItems({ ...parseState('?ring=144&rolling=60&pen=40,2,45,ff0000,00ff00,0000ff') });
    // Small render keeps the test fast; scan a 256px raster for colored (non-background, non-black) stroke pixels.
    const rgba = rasterize(items, '#ffffff', 256, {});
    let colored = 0;
    for (let i = 0; i < rgba.length; i += 4) {
      const r = rgba[i], g = rgba[i + 1], b = rgba[i + 2];
      // A red/green/blue gradient stroke pixel has strong color content and low grey flatness
      if ((r + g + b) < 700 && (Math.max(r, g, b) - Math.min(r, g, b)) > 60) colored++;
    }
    // The pattern must render plenty of colorful stroke pixels (would be ~0 if colors parsed to NaN/black).
    expect(colored).toBeGreaterThan(500);
  });

  it('rasterize background accepts both hex forms and short hex', () => {
    const items = buildItems({ ...parseState('?ring=50&rolling=30&pen=40,2,ff0000') });
    const full = rasterize(items, '#0b1026', 32, {});
    expect(full[0]).toBe(11);   // 0x0b
    expect(full[1]).toBe(16);   // 0x10
    expect(full[2]).toBe(38);   // 0x26
    const short = rasterize(items, 'abc', 32, {});
    expect([short[0], short[1], short[2]]).toEqual([170, 187, 204]);
  });
});
