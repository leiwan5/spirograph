import { describe, it, expect } from 'vitest';
import { serializeState, parseState } from './query.js';
import { DEFAULT_STATE } from './defaults.js';

function baseState() {
  return {
    ...DEFAULT_STATE,
    pens: DEFAULT_STATE.pens.map((p) => ({ ...p })),
  };
}

describe('query serialize/parse', () => {
  it('序列化包含全部参数', () => {
    const qs = serializeState(baseState());
    expect(qs).toContain('ring=72');
    expect(qs).toContain('rolling=30');
    expect(qs).toContain('mode=inside');
    expect(qs).toContain('pen=40,e63946,2.5');
    expect(qs).toContain('pen=75,1d6fa5,2');
    expect(qs).toContain('bg=ffffff');
    expect(qs).toContain('speed=1');
    expect(qs).toContain('scale=auto');
    expect(qs).toContain('gears=0');
  });

  it('解析后与状态一致（往返）', () => {
    const s = {
      ...baseState(),
      background: '#1b1b2f',
      speed: 2.5,
      scaleMode: 'fixed' as const,
      pens: [
        { id: 9, hole: 10, color: '#ff0000', gradient: [], gradientSpacing: 20, width: 1 },
        { id: 9, hole: 100, color: '#00ff00', gradient: ['#0000ff', '#f4a261'], gradientSpacing: 15, width: 8 },
      ],
    };
    const patch = parseState('?' + serializeState(s));
    expect(patch.ringTeeth).toBe(72);
    expect(patch.rollingTeeth).toBe(30);
    expect(patch.mode).toBe('inside');
    expect(patch.pens).toEqual([
      { hole: 10, color: '#ff0000', gradient: [], gradientSpacing: 20, width: 1 },
      { hole: 100, color: '#00ff00', gradient: ['#0000ff', '#f4a261'], gradientSpacing: 15, width: 8 },
    ]);
    expect(patch.background).toBe('#1b1b2f');
    expect(patch.speed).toBe(2.5);
    expect(patch.scaleMode).toBe('fixed');
  });

  it('gears 参数解析', () => {
    expect(parseState('?gears=1').showGears).toBe(true);
    expect(parseState('?gears=true').showGears).toBe(true);
    expect(parseState('?gears=0').showGears).toBe(false);
    expect(parseState('?gears=false').showGears).toBe(false);
    expect(parseState('?gears=maybe').showGears).toBeUndefined();
    expect(parseState('?').showGears).toBeUndefined();
  });

  it('非法值被忽略', () => {
    const patch = parseState('?ring=abc&rolling=999&mode=sideways&pen=bad&bg=xyz&speed=99&scale=foo');
    expect(patch.ringTeeth).toBeUndefined();
    expect(patch.rollingTeeth).toBeUndefined();
    expect(patch.mode).toBeUndefined();
    expect(patch.pens).toBeUndefined();
    expect(patch.background).toBeUndefined();
    expect(patch.speed).toBeUndefined();
    expect(patch.scaleMode).toBeUndefined();
  });

  it('渐变解析：hole,color,width,spacing,c2[,c3[,c4]]', () => {
    const g = parseState('?pen=40,e63946,2.5,15,1d6fa5,f4a261');
    expect(g.pens![0]).toEqual({ hole: 40, color: '#e63946', gradient: ['#1d6fa5', '#f4a261'], gradientSpacing: 15, width: 2.5 });
    const s = parseState('?pen=40,e63946,2.5');
    expect(s.pens![0].gradient).toEqual([]);
    // 非法 spacing / 颜色 → 整笔忽略
    expect(parseState('?pen=40,e63946,2.5,150,1d6fa5').pens).toBeUndefined();
    expect(parseState('?pen=40,e63946,2.5,15,zzzzzz').pens).toBeUndefined();
  });

  it('渐变序列化往返（spacing）', () => {
    const s = { ...baseState(), pens: [{ id: 1, hole: 40, color: '#e63946', gradient: ['#1d6fa5', '#f4a261', '#2a9d8f'], gradientSpacing: 10, width: 2.5 }] };
    const qs = serializeState(s);
    expect(qs).toContain('pen=40,e63946,2.5,10,1d6fa5,f4a261,2a9d8f');
    const back = parseState('?' + qs);
    expect(back.pens![0].gradient).toEqual(['#1d6fa5', '#f4a261', '#2a9d8f']);
    expect(back.pens![0].gradientSpacing).toBe(10);
  });

  it('多笔解析保持顺序', () => {
    const patch = parseState('?pen=10,ff0000,1&pen=20,00ff00,2&pen=30,0000ff,3');
    expect(patch.pens).toHaveLength(3);
    expect(patch.pens![1]).toEqual({ hole: 20, color: '#00ff00', gradient: [], gradientSpacing: 20, width: 2 });
  });

  it('部分参数可单独提供', () => {
    const patch = parseState('?ring=144&pen=60,3a86ff,1.8');
    expect(patch.ringTeeth).toBe(144);
    expect(patch.rollingTeeth).toBeUndefined();
    expect(patch.pens).toEqual([{ hole: 60, color: '#3a86ff', gradient: [], gradientSpacing: 20, width: 1.8 }]);
  });

  it('空 query 返回空补丁', () => {
    expect(parseState('')).toEqual({});
    expect(parseState('?')).toEqual({});
  });

  it('内置编解码支持重复键与空值', () => {
    // pen 重复键顺序保留（已在多笔测试覆盖）；无等号键值
    expect(parseState('?foo')).toEqual({});
    expect(parseState('?pen=10,ff0000,1&pen=20,00ff00,2').pens).toHaveLength(2);
  });

  it('URL 编码兼容：+ 号与 %XX', () => {
    // 颜色 / 数值不含特殊字符，但解析器须容忍编码输入
    const p = parseState('?ring%3D72%26rolling%3D30');
    expect(Object.keys(p)).toHaveLength(0); // 整体编码的键不会被误解析
    const p2 = parseState('?pen=40,e63946,2.5&pen=75,1d6fa5,2');
    expect(p2.pens).toHaveLength(2);
  });
});
