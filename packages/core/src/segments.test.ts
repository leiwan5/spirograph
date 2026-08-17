import { describe, it, expect } from 'vitest';
import { sampleCurve } from './math/curve.js';
import { computeBounds, computeTransform } from './geometry.js';
import { buildRenderData, segmentColor } from './segments.js';
import type { Pen, RenderItem } from './types.js';

function makeItems(): RenderItem[] {
  const pens: Pen[] = [
    { id: 1, hole: 40, colors: ['#e63946'], spacing: 20, width: 2.5 },
    { id: 2, hole: 75, colors: ['#1d6fa5', '#0000ff', '#f4a261'], spacing: 10, width: 2 },
  ];
  return pens.map((pen) => ({
    curve: sampleCurve(72, 30, 'inside', pen.hole),
    pen,
  }));
}

describe('buildRenderData (segment-level render contract)', () => {
  it('segment count matches curve points: each pen has count-1 segments (multi-color adds a closure segment +1)', () => {
    const items = makeItems();
    const bounds = computeBounds(items.map((i) => i.curve));
    const t = computeTransform(bounds, 800, 800, 32);
    const data = buildRenderData(items, t);
    expect(data.pens).toHaveLength(2);
    expect(data.pens[0].count).toBe(items[0].curve.count - 1); // solid: no closure segment
    expect(data.pens[1].count).toBe(items[1].curve.count); // multi-color: count-1 + closure segment
    expect(data.segments).toHaveLength((items[0].curve.count - 1) + items[1].curve.count);
  });

  it('coordinates are already transformed', () => {
    const items = makeItems();
    const t = { scale: 2, offsetX: 100, offsetY: 50 };
    const data = buildRenderData([items[0]], t);
    const s = data.segments[0];
    const { points } = items[0].curve;
    expect(s.x0).toBeCloseTo(points[0] * 2 + 100, 6);
    expect(s.y0).toBeCloseTo(points[1] * 2 + 50, 6);
    expect(s.x1).toBeCloseTo(points[2] * 2 + 100, 6);
  });

  it('solid pen uniformColor = colors[0], multi-color pen = null', () => {
    const items = makeItems();
    const data = buildRenderData(items, { scale: 1, offsetX: 0, offsetY: 0 });
    expect(data.pens[0].uniformColor).toBe('#e63946');
    expect(data.pens[1].uniformColor).toBeNull();
  });

  it('perPenLimit truncates the prefix (partial animation drawing)', () => {
    const items = makeItems();
    const data = buildRenderData(items, { scale: 1, offsetX: 0, offsetY: 0 }, { perPenLimit: [10, 20] });
    expect(data.pens[0].count).toBe(10);
    expect(data.pens[1].count).toBe(20); // not full → no closure segment
  });

  it('gradient closure segment color = closure color (t=1 back to the initial color)', () => {
    const items = makeItems();
    const data = buildRenderData([items[1]], { scale: 1, offsetX: 0, offsetY: 0 });
    const last = data.segments[data.segments.length - 1];
    // multi-color ['#1d6fa5', '#0000ff', '#f4a261'] spacing 10: t=1 → initial color
    expect(last.color).toBe('rgb(29,111,165)');
    // closure segment endpoints = curve first point
    expect(last.x1).toBeCloseTo(items[1].curve.points[0], 6);
    expect(last.y1).toBeCloseTo(items[1].curve.points[1], 6);
  });

  it('does not append a closure segment when closed=false', () => {
    const items = makeItems();
    const data = buildRenderData([items[1]], { scale: 1, offsetX: 0, offsetY: 0 }, { closed: false });
    expect(data.pens[0].count).toBe(items[1].curve.count - 1);
  });

  it('decimate merges segments (every d segments become 1)', () => {
    const items = makeItems();
    const data = buildRenderData([items[0]], { scale: 1, offsetX: 0, offsetY: 0 }, { decimate: 10 });
    expect(data.pens[0].count).toBe(Math.ceil((items[0].curve.count - 1) / 10));
  });

  it('segmentColor: solid returns colors[0], multi-color returns the midpoint color', () => {
    const [p1, p2] = makeItems().map((i) => i.pen);
    expect(segmentColor(p1, 5, 100)).toBe('#e63946');
    const c = segmentColor(p2, 0, 1000);
    expect(c).toMatch(/^rgb\(/);
  });
});
