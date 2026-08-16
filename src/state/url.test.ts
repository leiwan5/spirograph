import { describe, it, expect } from 'vitest';
import { serializeState, parseState } from './url';
import { DEFAULT_STATE } from './store';

function baseState() {
  return {
    ...DEFAULT_STATE,
    pens: DEFAULT_STATE.pens.map((p) => ({ ...p })),
  };
}

describe('url serialize/parse', () => {
  it('序列化包含全部参数', () => {
    const qs = serializeState(baseState());
    const pairs = new URLSearchParams(qs);
    expect(pairs.get('ring')).toBe('72');
    expect(pairs.get('rolling')).toBe('30');
    expect(pairs.get('mode')).toBe('inside');
    expect(pairs.getAll('pen')).toEqual(['40,e63946,2.5', '75,1d6fa5,2']);
    expect(pairs.get('bg')).toBe('ffffff');
    expect(pairs.get('speed')).toBe('1');
    expect(pairs.get('scale')).toBe('auto');
    expect(pairs.get('gears')).toBe('0');
  });

  it('解析后与状态一致（往返）', () => {
    const s = {
      ...baseState(),
      background: '#1b1b2f',
      speed: 2.5,
      scaleMode: 'fixed' as const,
      pens: [
        { id: 9, hole: 10, color: '#ff0000', gradient: [], gradientLoop: false, width: 1 },
        { id: 9, hole: 100, color: '#00ff00', gradient: [{ color: '#0000ff', pos: 30, trans: 5 }, { color: '#f4a261', pos: 50, trans: 0 }], gradientLoop: true, width: 8 },
      ],
    };
    const patch = parseState('?' + serializeState(s));
    expect(patch.ringTeeth).toBe(72);
    expect(patch.rollingTeeth).toBe(30);
    expect(patch.mode).toBe('inside');
    expect(patch.pens).toEqual([
      { hole: 10, color: '#ff0000', gradient: [], gradientLoop: false, width: 1 },
      { hole: 100, color: '#00ff00', gradient: [{ color: '#0000ff', pos: 30, trans: 5 }, { color: '#f4a261', pos: 50, trans: 0 }], gradientLoop: true, width: 8 },
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

  it('渐变 stops 解析：pos:color:trans 用 ~ 分隔', () => {
    const g = parseState('?pen=40,e63946,2.5,15:1d6fa5:5~30:f4a261:0');
    expect(g.pens![0]).toEqual({
      hole: 40, color: '#e63946',
      gradient: [{ color: '#1d6fa5', pos: 15, trans: 5 }, { color: '#f4a261', pos: 30, trans: 0 }],
      gradientLoop: false, width: 2.5,
    });
    const s = parseState('?pen=40,e63946,2.5');
    expect(s.pens![0].gradient).toEqual([]);
    // 非法 stops（缺少字段/非法 pos/非法色）→ 整笔忽略
    expect(parseState('?pen=40,e63946,2.5,15:1d6fa5').pens).toBeUndefined();
    expect(parseState('?pen=40,e63946,2.5,150:1d6fa5:5').pens).toBeUndefined();
    expect(parseState('?pen=40,e63946,2.5,15:zzzzzz:5').pens).toBeUndefined();
    // 断点数 1 或 >4 → 忽略
    expect(parseState('?pen=40,e63946,2.5,15:1d6fa5:5').pens).toBeUndefined();
  });

  it('渐变 stops 序列化往返（含 loop 标志）', () => {
    const s = { ...baseState(), pens: [{ id: 1, hole: 40, color: '#e63946', gradient: [{ color: '#1d6fa5', pos: 15, trans: 5 }, { color: '#f4a261', pos: 30, trans: 0 }], gradientLoop: false, width: 2.5 }] };
    const qs = serializeState(s);
    expect(new URLSearchParams(qs).getAll('pen')[0]).toBe('40,e63946,2.5,15:1d6fa5:5~30:f4a261:0');
    const back = parseState('?' + qs);
    expect(back.pens![0].gradient).toEqual([{ color: '#1d6fa5', pos: 15, trans: 5 }, { color: '#f4a261', pos: 30, trans: 0 }]);
    expect(back.pens![0].gradientLoop).toBe(false);
    // 循环渐变换行 loop='1'
    const s2 = { ...baseState(), pens: [{ id: 1, hole: 40, color: '#e63946', gradient: [{ color: '#1d6fa5', pos: 15, trans: 5 }, { color: '#f4a261', pos: 30, trans: 0 }], gradientLoop: true, width: 2.5 }] };
    expect(new URLSearchParams(serializeState(s2)).getAll('pen')[0]).toBe('40,e63946,2.5,15:1d6fa5:5~30:f4a261:0,1');
    expect(parseState('?' + serializeState(s2)).pens![0].gradientLoop).toBe(true);
  });

  it('多笔解析保持顺序', () => {
    const patch = parseState('?pen=10,ff0000,1&pen=20,00ff00,2&pen=30,0000ff,3');
    expect(patch.pens).toHaveLength(3);
    expect(patch.pens![1]).toEqual({ hole: 20, color: '#00ff00', gradient: [], gradientLoop: false, width: 2 });
  });

  it('部分参数可单独提供', () => {
    const patch = parseState('?ring=144&pen=60,3a86ff,1.8');
    expect(patch.ringTeeth).toBe(144);
    expect(patch.rollingTeeth).toBeUndefined();
    expect(patch.pens).toEqual([{ hole: 60, color: '#3a86ff', gradient: [], gradientLoop: false, width: 1.8 }]);
  });

  it('空 query 返回空补丁', () => {
    expect(parseState('')).toEqual({});
    expect(parseState('?')).toEqual({});
  });
});
