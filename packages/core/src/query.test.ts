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
  it('serializes all params', () => {
    const qs = serializeState(baseState());
    expect(qs).toContain('ring=72');
    expect(qs).toContain('rolling=30');
    expect(qs).toContain('mode=inside');
    // solid pen: hole,width,color
    expect(qs).toContain('pen=40,2.5,e63946');
    expect(qs).toContain('pen=75,2,1d6fa5');
    expect(qs).toContain('bg=ffffff');
    expect(qs).toContain('speed=1');
    expect(qs).toContain('scale=auto');
    expect(qs).toContain('gears=0');
  });

  it('parses back to the same state (round trip)', () => {
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

  it('parses the gears param', () => {
    expect(parseState('?gears=1').showGears).toBe(true);
    expect(parseState('?gears=true').showGears).toBe(true);
    expect(parseState('?gears=0').showGears).toBe(false);
    expect(parseState('?gears=false').showGears).toBe(false);
    expect(parseState('?gears=maybe').showGears).toBeUndefined();
    expect(parseState('?').showGears).toBeUndefined();
  });

  it('ignores invalid values', () => {
    const patch = parseState('?ring=abc&rolling=999&mode=sideways&pen=bad&bg=xyz&speed=99&scale=foo');
    expect(patch.ringTeeth).toBeUndefined();
    expect(patch.rollingTeeth).toBeUndefined();
    expect(patch.mode).toBeUndefined();
    expect(patch.pens).toBeUndefined();
    expect(patch.background).toBeUndefined();
    expect(patch.speed).toBeUndefined();
    expect(patch.scaleMode).toBeUndefined();
  });

  it('parses a solid pen: hole,width,c1', () => {
    const s = parseState('?pen=40,2.5,e63946');
    expect(s.pens![0]).toEqual({ hole: 40, colors: ['#e63946'], spacing: 20, width: 2.5 });
  });

  it('parses a multi-color pen: hole,width,spacing,c1[,c2[,c3[,c4]]]', () => {
    const g = parseState('?pen=40,2.5,15,1d6fa5,f4a261');
    expect(g.pens![0]).toEqual({ hole: 40, colors: ['#1d6fa5', '#f4a261'], spacing: 15, width: 2.5 });
    // invalid spacing / color → the whole pen is ignored
    expect(parseState('?pen=40,2.5,150,1d6fa5').pens).toBeUndefined();
    expect(parseState('?pen=40,2.5,15,zzzzzz').pens).toBeUndefined();
    // 4 colors (7 fields)
    const four = parseState('?pen=40,2.5,10,e63946,1d6fa5,f4a261,2a9d8f');
    expect(four.pens![0].colors).toEqual(['#e63946', '#1d6fa5', '#f4a261', '#2a9d8f']);
  });

  it('multi-color serialization round trip (spacing)', () => {
    const s = { ...baseState(), pens: [{ id: 1, hole: 40, colors: ['#e63946', '#1d6fa5', '#f4a261', '#2a9d8f'], spacing: 10, width: 2.5 }] };
    const qs = serializeState(s);
    expect(qs).toContain('pen=40,2.5,10,e63946,1d6fa5,f4a261,2a9d8f');
    const back = parseState('?' + qs);
    expect(back.pens![0].colors).toEqual(['#e63946', '#1d6fa5', '#f4a261', '#2a9d8f']);
    expect(back.pens![0].spacing).toBe(10);
  });

  it('preserves order across multiple pens', () => {
    const patch = parseState('?pen=10,1,ff0000&pen=20,2,00ff00&pen=30,3,0000ff');
    expect(patch.pens).toHaveLength(3);
    expect(patch.pens![1]).toEqual({ hole: 20, colors: ['#00ff00'], spacing: 20, width: 2 });
  });

  it('allows providing only some params', () => {
    const patch = parseState('?ring=144&pen=60,1.8,3a86ff');
    expect(patch.ringTeeth).toBe(144);
    expect(patch.rollingTeeth).toBeUndefined();
    expect(patch.pens).toEqual([{ hole: 60, colors: ['#3a86ff'], spacing: 20, width: 1.8 }]);
  });

  it('empty query returns an empty patch', () => {
    expect(parseState('')).toEqual({});
    expect(parseState('?')).toEqual({});
  });

  it('built-in codec supports duplicate keys and empty values', () => {
    // duplicate pen keys keep order (covered by the multi-pen test); keys without "=" values
    expect(parseState('?foo')).toEqual({});
    expect(parseState('?pen=10,1,ff0000&pen=20,2,00ff00').pens).toHaveLength(2);
  });

  it('is URL-encoding compatible: + sign and %XX', () => {
    // colors / numbers contain no special chars, but the parser must tolerate encoded input
    const p = parseState('?ring%3D72%26rolling%3D30');
    expect(Object.keys(p)).toHaveLength(0); // fully-encoded keys are not mis-parsed
    const p2 = parseState('?pen=40,2.5,e63946');
    expect(p2.pens).toHaveLength(1);
    expect(p2.pens![0].colors).toEqual(['#e63946']);
  });

  it('the spacing field is unambiguous against colors (spacing is always a numeric field)', () => {
    // 6-digit all-numeric strings parse as colors (e.g. 2a9d8f is a valid hex); spacing must come before the color group
    const g = parseState('?pen=40,2.5,e63946,2a9d8f'); // len=4 → is the 2nd segment spacing? 2a9d8f isn't numeric → whole pen ignored
    expect(g.pens).toBeUndefined();
    const ok = parseState('?pen=40,2.5,10,2a9d8f'); // explicit spacing 10 + color 2a9d8f
    expect(ok.pens![0].colors).toEqual(['#2a9d8f']);
  });
});