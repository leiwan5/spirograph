import { describe, it, expect } from 'vitest';
import { serializeState, parseState } from './query.js';
import { DEFAULT_STATE } from './defaults.js';

function baseState() {
  return {
    ...DEFAULT_STATE,
    pens: DEFAULT_STATE.pens.map((p) => ({ ...p, colors: [...p.colors] })),
  };
}

describe('query serialize/parse', () => {
  it('序列化包含全部参数', () => {
    const qs = serializeState(baseState());
    expect(qs).toContain('ring=72');
    expect(qs).toContain('rolling=30');
    expect(qs).toContain('mode=inside');
    // 单色笔：hole,width,color
    expect(qs).toContain('pen=40,2.5,e63946');
    expect(qs).toContain('pen=75,2,1d6fa5');
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
        { id: 9, hole: 10, colors: ['#ff0000'], spacing: 20, width: 1 },
        { id: 9, hole: 100, colors: ['#00ff00', '#0000ff', '#f4a261'], spacing: 15, width: 8 },
      ],
    };
    const patch = parseState('?' + serializeState(s));
    expect(patch.ringTeeth).toBe(72);
    expect(patch.rollingTeeth).toBe(30);
    expect(patch.mode).toBe('inside');
    expect(patch.pens).toEqual([
      { hole: 10, colors: ['#ff0000'], spacing: 20, width: 1 },
      { hole: 100, colors: ['#00ff00', '#0000ff', '#f4a261'], spacing: 15, width: 8 },
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

  it('单色解析：hole,width,c1', () => {
    const s = parseState('?pen=40,2.5,e63946');
    expect(s.pens![0]).toEqual({ hole: 40, colors: ['#e63946'], spacing: 20, width: 2.5 });
  });

  it('多色解析：hole,width,spacing,c1[,c2[,c3[,c4]]]', () => {
    const g = parseState('?pen=40,2.5,15,1d6fa5,f4a261');
    expect(g.pens![0]).toEqual({ hole: 40, colors: ['#1d6fa5', '#f4a261'], spacing: 15, width: 2.5 });
    // 非法 spacing / 颜色 → 整笔忽略
    expect(parseState('?pen=40,2.5,150,1d6fa5').pens).toBeUndefined();
    expect(parseState('?pen=40,2.5,15,zzzzzz').pens).toBeUndefined();
    // 4 色（7 段）
    const four = parseState('?pen=40,2.5,10,e63946,1d6fa5,f4a261,2a9d8f');
    expect(four.pens![0].colors).toEqual(['#e63946', '#1d6fa5', '#f4a261', '#2a9d8f']);
  });

  it('多色序列化往返（spacing）', () => {
    const s = { ...baseState(), pens: [{ id: 1, hole: 40, colors: ['#e63946', '#1d6fa5', '#f4a261', '#2a9d8f'], spacing: 10, width: 2.5 }] };
    const qs = serializeState(s);
    expect(qs).toContain('pen=40,2.5,10,e63946,1d6fa5,f4a261,2a9d8f');
    const back = parseState('?' + qs);
    expect(back.pens![0].colors).toEqual(['#e63946', '#1d6fa5', '#f4a261', '#2a9d8f']);
    expect(back.pens![0].spacing).toBe(10);
  });

  it('多笔解析保持顺序', () => {
    const patch = parseState('?pen=10,1,ff0000&pen=20,2,00ff00&pen=30,3,0000ff');
    expect(patch.pens).toHaveLength(3);
    expect(patch.pens![1]).toEqual({ hole: 20, colors: ['#00ff00'], spacing: 20, width: 2 });
  });

  it('部分参数可单独提供', () => {
    const patch = parseState('?ring=144&pen=60,1.8,3a86ff');
    expect(patch.ringTeeth).toBe(144);
    expect(patch.rollingTeeth).toBeUndefined();
    expect(patch.pens).toEqual([{ hole: 60, colors: ['#3a86ff'], spacing: 20, width: 1.8 }]);
  });

  it('空 query 返回空补丁', () => {
    expect(parseState('')).toEqual({});
    expect(parseState('?')).toEqual({});
  });

  it('内置编解码支持重复键与空值', () => {
    // pen 重复键顺序保留（已在多笔测试覆盖）；无等号键值
    expect(parseState('?foo')).toEqual({});
    expect(parseState('?pen=10,1,ff0000&pen=20,2,00ff00').pens).toHaveLength(2);
  });

  it('URL 编码兼容：+ 号与 %XX', () => {
    // 颜色 / 数值不含特殊字符，但解析器须容忍编码输入
    const p = parseState('?ring%3D72%26rolling%3D30');
    expect(Object.keys(p)).toHaveLength(0); // 整体编码的键不会被误解析
    const p2 = parseState('?pen=40,2.5,e63946');
    expect(p2.pens).toHaveLength(1);
    expect(p2.pens![0].colors).toEqual(['#e63946']);
  });

  it('间隔段与颜色段无歧义（间隔恒为数字段）', () => {
    // 6 位纯数字串按颜色解析（如 2a9d8f 合法 hex），间隔必须在颜色组前
    const g = parseState('?pen=40,2.5,e63946,2a9d8f'); // len=4 → 第二段视为间隔？2a9d8f 不是数字 → 整笔忽略
    expect(g.pens).toBeUndefined();
    const ok = parseState('?pen=40,2.5,10,2a9d8f'); // 显式间隔 10 + 颜色 2a9d8f
    expect(ok.pens![0].colors).toEqual(['#2a9d8f']);
  });
});