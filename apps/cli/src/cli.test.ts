import { describe, it, expect } from 'vitest';
import { parseArgs, generate, main } from './cli.js';

describe('parseArgs', () => {
  it('解析 params/format/size', () => {
    const o = parseArgs(['generate', '--params', 'ring=72&rolling=30', '--format', 'png', '--size', '2048']);
    expect(o).toEqual({ params: 'ring=72&rolling=30', format: 'png', size: 2048 });
  });

  it('默认 format=png', () => {
    const o = parseArgs(['generate', '--params', 'ring=72']);
    expect(o!.format).toBe('png');
  });

  it('size clamp 到 64–4096', () => {
    expect(parseArgs(['generate', '--params', 'ring=72', '--size', '99999'])!.size).toBe(4096);
    expect(parseArgs(['generate', '--params', 'ring=72', '--size', '10'])!.size).toBe(64);
  });

  it('非法 format 抛错', () => {
    expect(() => parseArgs(['generate', '--params', 'ring=72', '--format', 'gif'])).toThrow();
  });

  it('无参数时返回 null（帮助）', () => {
    expect(parseArgs([])).toBeNull();
    expect(parseArgs(['--help'])).toBeNull();
  });
});

describe('generate（纯逻辑）', () => {
  it('生成合法 PNG', () => {
    const r = generate({ params: 'ring=72&rolling=30&pen=40,e63946,2.5', format: 'png' });
    expect(r.format).toBe('png');
    const data = r.data as Uint8Array;
    expect(data[0]).toBe(137);
    expect(data[1]).toBe(80);
    expect(new DataView(data.buffer, 16, 4).getUint32(0)).toBe(1000);
    expect(r.filename).toBe('spirograph.png');
  });

  it('生成 SVG', () => {
    const r = generate({ params: 'ring=72&rolling=30&pen=40,e63946,2.5', format: 'svg' });
    expect(r.data).toContain('<?xml');
    expect(r.data).toContain('</svg>');
    expect(r.filename).toBe('spirograph.svg');
  });

  it('json 参数可用', () => {
    const r = generate({ json: '{"mode":"inside","ringTeeth":72,"rollingTeeth":30,"pens":[{"hole":40,"color":"#e63946","width":2.5}]}', format: 'png' });
    expect((r.data as Uint8Array)[0]).toBe(137);
  });
});

describe('main（写文件）', () => {
  it('生成并写入文件', () => {
    const written: Array<[string, Uint8Array | string]> = [];
    const logs: string[] = [];
    const code = main(
      ['generate', '--params', 'ring=72&rolling=30&pen=40,e63946,2.5', '--format', 'svg', '--out', '/tmp/x.svg'],
      (path, data) => written.push([path, data]),
      (m) => logs.push(m),
    );
    expect(code).toBe(0);
    expect(written).toHaveLength(1);
    expect(written[0][0]).toBe('/tmp/x.svg');
    expect(String(written[0][1])).toContain('<svg');
    expect(logs[0]).toContain('已生成 SVG');
  });

  it('错误时返回非零并显示帮助', () => {
    const logs: string[] = [];
    const code = main(['generate'], () => {}, (m) => logs.push(m));
    expect(code).toBe(1);
    expect(logs.some((l) => l.includes('✗'))).toBe(true);
  });

  it('--help 返回 0', () => {
    const code = main(['--help'], () => {}, () => {});
    expect(code).toBe(0);
  });
});
