/** 最大公约数 */
export function gcd(a: number, b: number): number {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b !== 0) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a;
}

/** 化简齿数比，返回 p:q = ringTeeth/gcd : rollingTeeth/gcd */
export function reduceRatio(ringTeeth: number, rollingTeeth: number): { p: number; q: number } {
  const g = gcd(ringTeeth, rollingTeeth);
  return { p: ringTeeth / g, q: rollingTeeth / g };
}

/**
 * 花瓣数：
 * 内切 (R−r)/gcd = p−q；外切 (R+r)/gcd = p+q
 */
export function petals(ringTeeth: number, rollingTeeth: number, mode: 'inside' | 'outside'): number {
  const { p, q } = reduceRatio(ringTeeth, rollingTeeth);
  return mode === 'inside' ? p - q : p + q;
}

/**
 * 内切啮合初始相位：使 t=0 时滚动齿轮齿尖对准最近的环形齿轮齿谷中心。
 * 滚动中心在 (R−r, 0)，齿尖相对滚动中心方向 θ = spin + 0.5·stepRoll。
 * 齿尖的极角（环中心为原点）须等于谷中心方向 φ = (j+1)·stepRing：
 *   sin(θ − φ) = sin(φ)·(R−r)/(r+toothDepth)   （滚动中心偏心修正）
 * 对相邻几个谷中心取使 |spin| 最小的解。外切（环外无齿）不需要偏移。
 */
export function meshPhase(ringTeeth: number, rollingTeeth: number, toothDepth = 0.2): number {
  const stepRing = (Math.PI * 2) / ringTeeth;
  const stepRoll = (Math.PI * 2) / rollingTeeth;
  const R = ringTeeth;
  const r = rollingTeeth;
  const c = (R - r) / (r + toothDepth);
  const halfRollTip = 0.5 * stepRoll;
  const jStart = Math.round((0.5 * ringTeeth) / rollingTeeth - 1) - 2;
  let best = 0;
  let bestDiff = Infinity;
  for (let j = jStart; j < jStart + 5; j++) {
    const phi = (j + 1) * stepRing;
    const asinArg = Math.sin(phi) * c;
    if (asinArg < -1 || asinArg > 1) continue;
    const theta = phi + Math.asin(asinArg);
    const spin = theta - halfRollTip;
    const diff = Math.abs(spin);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = spin;
    }
  }
  return best;
}

/** 校验组合合法性：内切时滚动齿轮齿数必须小于环形齿轮 */
export function validateGears(ringTeeth: number, rollingTeeth: number, mode: 'inside' | 'outside'): string | null {
  if (!Number.isInteger(ringTeeth) || ringTeeth < 2) return '环形齿轮齿数必须是不小于 2 的整数';
  if (!Number.isInteger(rollingTeeth) || rollingTeeth < 1) return '滚动齿轮齿数必须是不小于 1 的整数';
  if (mode === 'inside' && rollingTeeth >= ringTeeth) {
    return '内切模式下滚动齿轮齿数必须小于环形齿轮';
  }
  return null;
}
