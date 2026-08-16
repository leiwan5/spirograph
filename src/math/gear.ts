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

/** 校验组合合法性：内切时滚动齿轮齿数必须小于环形齿轮 */
export function validateGears(ringTeeth: number, rollingTeeth: number, mode: 'inside' | 'outside'): string | null {
  if (!Number.isInteger(ringTeeth) || ringTeeth < 2) return '环形齿轮齿数必须是不小于 2 的整数';
  if (!Number.isInteger(rollingTeeth) || rollingTeeth < 1) return '滚动齿轮齿数必须是不小于 1 的整数';
  if (mode === 'inside' && rollingTeeth >= ringTeeth) {
    return '内切模式下滚动齿轮齿数必须小于环形齿轮';
  }
  return null;
}
