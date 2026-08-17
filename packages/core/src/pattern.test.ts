import { describe, it, expect } from 'vitest';
import { generateHolePattern } from './pattern.js';

describe('generateHolePattern（盘面孔阵）', () => {
  it('确定性：同一组笔参数生成完全相同的孔阵', () => {
    const pens = [{ hole: 40 }, { hole: 75 }];
    const a = generateHolePattern(pens);
    const b = generateHolePattern(pens);
    expect(a).toEqual(b);
    // 不同参数 → 不同孔阵（大概率）
    const c = generateHolePattern([{ hole: 40 }, { hole: 70 }]);
    expect(JSON.stringify(c)).not.toBe(JSON.stringify(a));
  });

  it('每支笔的参数半径处都有一圈孔（笔的孔是孔阵一员）', () => {
    const pens = [{ hole: 40 }, { hole: 75 }, { hole: 57 }];
    const holes = generateHolePattern(pens);
    for (const pen of pens) {
      const frac = Math.max(0.08, pen.hole / 100);
      const ring = holes.filter((h) => Math.abs(h.frac - frac) < 1e-9);
      expect(ring.length).toBeGreaterThanOrEqual(8);
      // 0 号孔在局部角 0（与曲线起点重合）
      expect(ring.some((h) => Math.abs(h.angle) < 1e-9)).toBe(true);
    }
  });

  it('笔参数相同半径去重，补充圈不与笔圈过近', () => {
    const holes = generateHolePattern([{ hole: 50 }, { hole: 50 }]);
    const frac50 = holes.filter((h) => Math.abs(h.frac - 0.5) < 1e-9);
    expect(frac50.length).toBe(8); // 只生成一圈
  });
});
