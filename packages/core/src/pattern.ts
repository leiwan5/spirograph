/** 孔阵中的一个孔（盘面局部坐标：frac = 半径比例，angle = 局部角） */
export interface HolePatternHole {
  frac: number;
  angle: number;
}

/** 确定性随机数（基于笔参数种子，同一组参数 → 同一孔阵） */
function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * 根据笔参数生成盘面孔阵：
 * - 每支笔的参数半径（hole%·r）处有一圈孔，0 号孔在局部角 0（与曲线起点严格重合）
 *   → 所有笔的孔都是孔阵的一员，笔尖插在孔正中间
 * - 再确定性随机补充若干圈装饰孔，使盘面像真实万花尺的钻孔布局
 */
export function generateHolePattern(pens: Array<{ hole: number }>): HolePatternHole[] {
  const seed = pens.reduce((h, p) => h * 31 + Math.round(p.hole), 7) >>> 0;
  const rnd = seededRandom(seed);
  const holes: HolePatternHole[] = [];
  const usedFracs = new Set<number>();

  // 笔参数圈：0 号孔在局部角 0
  for (const pen of pens) {
    const frac = Math.max(0.08, pen.hole / 100);
    if (usedFracs.has(frac)) continue;
    for (let k = 0; k < 8; k++) {
      holes.push({ frac, angle: (k / 8) * Math.PI * 2 });
    }
    usedFracs.add(frac);
  }

  // 补充圈（装饰，随机半径与孔数，避免与已有圈过近）
  const target = Math.min(5, usedFracs.size + 2);
  let guard = 0;
  while (usedFracs.size < target && guard++ < 30) {
    const frac = 0.12 + rnd() * 0.76;
    if ([...usedFracs].some((f) => Math.abs(f - frac) < 0.14)) continue;
    const n = 7 + Math.floor(rnd() * 3);
    const offset = rnd() * ((Math.PI * 2) / n);
    for (let k = 0; k < n; k++) {
      holes.push({ frac, angle: offset + (k / n) * Math.PI * 2 });
    }
    usedFracs.add(frac);
  }
  return holes;
}
