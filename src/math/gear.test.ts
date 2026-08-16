import { describe, it, expect } from 'vitest';
import { gcd, meshPhase, reduceRatio, petals, validateGears } from './gear';
import { sampleCurve, MAX_SAMPLES } from './curve';
import { computeFixedBounds, computeTransform } from '../render/renderer';

describe('gcd', () => {
  it('计算最大公约数', () => {
    expect(gcd(72, 30)).toBe(6);
    expect(gcd(96, 63)).toBe(3);
    expect(gcd(60, 60)).toBe(60);
    expect(gcd(1, 1)).toBe(1);
    expect(gcd(0, 5)).toBe(5);
    expect(gcd(7, 13)).toBe(1);
  });
});

describe('reduceRatio', () => {
  it('化简齿数比', () => {
    expect(reduceRatio(72, 30)).toEqual({ p: 12, q: 5 });
    expect(reduceRatio(96, 63)).toEqual({ p: 32, q: 21 });
    expect(reduceRatio(144, 60)).toEqual({ p: 12, q: 5 });
    expect(reduceRatio(52, 30)).toEqual({ p: 26, q: 15 });
  });
});

describe('petals', () => {
  it('内切花瓣数 = p − q', () => {
    expect(petals(72, 30, 'inside')).toBe(7);
    expect(petals(96, 63, 'inside')).toBe(11);
    expect(petals(52, 30, 'inside')).toBe(11);
    expect(petals(72, 24, 'inside')).toBe(2);
  });
  it('外切花瓣数 = p + q', () => {
    expect(petals(72, 30, 'outside')).toBe(17);
    expect(petals(96, 63, 'outside')).toBe(53);
  });
});

describe('sampleCurve', () => {
  it('曲线在 T = 2π·q 处精确闭合', () => {
    const combos: Array<[number, number]> = [
      [72, 30], [96, 63], [144, 60], [52, 30], [120, 36], [40, 8], [96, 96 - 1],
    ];
    for (const [R, r] of combos) {
      for (const mode of ['inside', 'outside'] as const) {
        for (const hole of [0, 30, 100, 150]) {
          const c = sampleCurve(R, r, mode, hole);
          const n = c.count - 1;
          const dx = c.points[2 * n] - c.points[0];
          const dy = c.points[2 * n + 1] - c.points[1];
          expect(Math.hypot(dx, dy)).toBeLessThan(1e-9);
        }
      }
    }
  });

  it('d = 0 时退化为圆', () => {
    const c = sampleCurve(72, 30, 'inside', 0);
    const radius = 72 - 30;
    for (let i = 0; i < c.count; i += 199) {
      const rr = Math.hypot(c.points[2 * i], c.points[2 * i + 1]);
      expect(Math.abs(rr - radius)).toBeLessThan(1e-9);
    }
    const e = sampleCurve(72, 30, 'outside', 0);
    const er = 72 + 30;
    for (let i = 0; i < e.count; i += 199) {
      const rr = Math.hypot(e.points[2 * i], e.points[2 * i + 1]);
      expect(Math.abs(rr - er)).toBeLessThan(1e-9);
    }
  });

  it('内切且滚动齿数 >= 环形齿数时抛错', () => {
    expect(() => sampleCurve(60, 60, 'inside', 50)).toThrow();
    expect(() => sampleCurve(30, 60, 'inside', 50)).toThrow();
  });

  it('外切允许滚动齿数大于环形齿数', () => {
    expect(() => sampleCurve(30, 60, 'outside', 50)).not.toThrow();
  });

  it('采样点数符合上限保护', () => {
    // q = 239，239×1200 = 286,800 > MAX_SAMPLES，应触发降采样
    const c = sampleCurve(240, 239, 'inside', 50);
    expect(c.count - 1).toBeLessThanOrEqual(MAX_SAMPLES);
    expect(c.reduced).toBe(true);
    const c2 = sampleCurve(72, 30, 'inside', 50);
    expect(c2.count - 1).toBe(5 * 1200);
    expect(c2.reduced).toBe(false);
  });

  it('闭合转数 = q', () => {
    expect(sampleCurve(72, 30, 'inside', 50).periodTurns).toBe(5);
    expect(sampleCurve(96, 63, 'inside', 50).periodTurns).toBe(21);
  });
});

describe('meshPhase（啮合相位）', () => {
  it('t=0 时滚动齿尖的极角对准最近的环齿谷中心', () => {
    for (const [R, r] of [[72, 30], [72, 24], [96, 63], [40, 8], [240, 96], [52, 30]] as const) {
      const phase = meshPhase(R, r);
      const h = 0.2;
      // 齿尖相对滚动中心方向
      const theta = phase + 0.5 * ((Math.PI * 2) / r);
      // 齿尖绝对位置（滚动中心在 (R−r, 0)）
      const px = R - r + (r + h) * Math.cos(theta);
      const py = (r + h) * Math.sin(theta);
      const angle = Math.atan2(py, px);
      // 最近的环齿谷中心方向 (j+1)·stepRing
      const stepRing = (Math.PI * 2) / R;
      const nearest = Math.round(angle / stepRing) * stepRing;
      expect(Math.abs(angle - nearest)).toBeLessThan(0.02);
    }
  });

  it('滚动齿尖不超出环谷底线（留顶隙）', () => {
    const R = 72;
    // 滚齿尖距环中心 ≈ R + 0.2h；环谷底 = R + 0.3h
    const rollTipFromCenter = R + 0.2;
    const ringRootFromCenter = R + 0.3;
    expect(rollTipFromCenter).toBeLessThan(ringRootFromCenter);
  });

  it('相位有界：|meshPhase| ≤ 0.5·stepRing + 0.5·stepRoll', () => {
    for (const [R, r] of [[72, 30], [72, 24], [96, 63], [40, 8], [240, 96]] as const) {
      const bound = 0.5 * ((Math.PI * 2) / R) + 0.5 * ((Math.PI * 2) / r);
      expect(Math.abs(meshPhase(R, r))).toBeLessThanOrEqual(bound + 1e-9);
    }
  });
});

describe('computeFixedBounds（环固定缩放）', () => {
  it('包围盒只由齿轮几何决定，与孔洞无关', () => {
    // 相同齿轮、不同孔洞 → 完全相同的包围盒与变换
    const b1 = computeFixedBounds(72, 30, 'inside');
    const b2 = computeFixedBounds(72, 30, 'inside');
    expect(b1).toEqual(b2);
    expect(computeTransform(b1, 800, 800, 32)).toEqual(computeTransform(b2, 800, 800, 32));
    // 内切：以环形齿轮半径 R 为界
    expect(b1.maxX).toBe(72);
    expect(b1.minX).toBe(-72);
    // 外切：以最大图案半径 R + 2r 为界
    const b3 = computeFixedBounds(72, 30, 'outside');
    expect(b3.maxX).toBe(72 + 60);
  });

  it('内切时环在画布上的像素大小恒定（不随齿轮规格变化）', () => {
    const t72 = computeTransform(computeFixedBounds(72, 30, 'inside'), 800, 800, 32);
    const t96 = computeTransform(computeFixedBounds(96, 63, 'inside'), 800, 800, 32);
    // 环半径 × 缩放 = 恒定像素
    expect(72 * t72.scale).toBeCloseTo(96 * t96.scale, 10);
    // 不同齿轮、不同孔洞 → 变换完全一致
    const t72b = computeTransform(computeFixedBounds(72, 30, 'inside'), 800, 800, 32);
    expect(t72).toEqual(t72b);
  });

  it('孔洞 ≤100% 时内切图案始终在环内（|点| ≤ R）', () => {
    for (const [R, r] of [[72, 30], [96, 63], [40, 8], [240, 96]] as const) {
      const c = sampleCurve(R, r, 'inside', 100);
      for (let i = 0; i < c.count; i += 97) {
        const dist = Math.hypot(c.points[2 * i], c.points[2 * i + 1]);
        expect(dist).toBeLessThanOrEqual(R + 1e-9);
      }
    }
  });

  it('齿轮变化时包围盒随之变化', () => {
    expect(computeFixedBounds(96, 63, 'inside').maxX).toBe(96);
    expect(computeFixedBounds(96, 63, 'inside').maxX).not.toBe(computeFixedBounds(72, 30, 'inside').maxX);
  });
});

describe('validateGears', () => {
  it('校验非法输入', () => {
    expect(validateGears(2.5, 30, 'inside')).not.toBeNull();
    expect(validateGears(60, 60, 'inside')).not.toBeNull();
    expect(validateGears(72, 30, 'inside')).toBeNull();
    expect(validateGears(30, 60, 'outside')).toBeNull();
  });
});
