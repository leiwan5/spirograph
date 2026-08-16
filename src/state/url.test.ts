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
  });

  it('解析后与状态一致（往返）', () => {
    const s = {
      ...baseState(),
      background: '#1b1b2f',
      speed: 2.5,
      scaleMode: 'fixed' as const,
      pens: [
        { id: 9, hole: 10, color: '#ff0000', width: 1 },
        { id: 9, hole: 100, color: '#00ff00', width: 8 },
      ],
    };
    const patch = parseState('?' + serializeState(s));
    expect(patch.ringTeeth).toBe(72);
    expect(patch.rollingTeeth).toBe(30);
    expect(patch.mode).toBe('inside');
    expect(patch.pens).toEqual([
      { hole: 10, color: '#ff0000', width: 1 },
      { hole: 100, color: '#00ff00', width: 8 },
    ]);
    expect(patch.background).toBe('#1b1b2f');
    expect(patch.speed).toBe(2.5);
    expect(patch.scaleMode).toBe('fixed');
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

  it('多笔解析保持顺序', () => {
    const patch = parseState('?pen=10,ff0000,1&pen=20,00ff00,2&pen=30,0000ff,3');
    expect(patch.pens).toHaveLength(3);
    expect(patch.pens![1]).toEqual({ hole: 20, color: '#00ff00', width: 2 });
  });

  it('部分参数可单独提供', () => {
    const patch = parseState('?ring=144&pen=60,3a86ff,1.8');
    expect(patch.ringTeeth).toBe(144);
    expect(patch.rollingTeeth).toBeUndefined();
    expect(patch.pens).toEqual([{ hole: 60, color: '#3a86ff', width: 1.8 }]);
  });

  it('空 query 返回空补丁', () => {
    expect(parseState('')).toEqual({});
    expect(parseState('?')).toEqual({});
  });
});
