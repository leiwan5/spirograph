import { describe, it, expect } from 'vitest';
import { generatePng, generateSvg, encodePng } from '../server/image';

describe('服务端图片生成（部署端点复用）', () => {
  it('encodePng 输出合法 PNG 签名', () => {
    const rgba = new Uint8Array(64 * 64 * 4).fill(255);
    const png = encodePng(64, 64, rgba);
    expect(png[0]).toBe(137);
    expect(png[1]).toBe(80);
    expect(png[2]).toBe(78);
    expect(png[3]).toBe(71);
    // IHDR 尺寸
    const dv = new DataView(png.buffer, 16, 8);
    expect(dv.getUint32(0)).toBe(64);
    expect(dv.getUint32(4)).toBe(64);
  });

  it('generatePng 输出有效 PNG（默认参数）', () => {
    const png = generatePng('?ring=72&rolling=30&pen=40,e63946,2.5&pen=75,1d6fa5,2');
    expect(png[0]).toBe(137);
    const dv = new DataView(png.buffer, 16, 8);
    expect(dv.getUint32(0)).toBe(1000);
    expect(dv.getUint32(4)).toBe(1000);
  });

  it('generatePng 支持 size 参数与 clamp', () => {
    expect(new DataView(generatePng('?size=512').buffer, 16, 4).getUint32(0)).toBe(512);
    expect(new DataView(generatePng('?size=99999').buffer, 16, 4).getUint32(0)).toBe(4096);
  });

  it('generateSvg 输出 SVG 文档', () => {
    const svg = generateSvg('?ring=72&rolling=30&pen=40,e63946,2.5');
    expect(svg.startsWith('<?xml')).toBe(true);
    expect(svg).toContain('<svg');
    expect(svg).toContain('stroke="#e63946"');
  });

  it('非法参数回退默认', () => {
    const png = generatePng('?ring=abc&rolling=999&pen=bad');
    expect(new DataView(png.buffer, 16, 4).getUint32(0)).toBe(1000);
  });
});
