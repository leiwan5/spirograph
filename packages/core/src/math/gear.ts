/** Greatest common divisor */
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

/** Reduce the teeth ratio, returning p:q = ringTeeth/gcd : rollingTeeth/gcd */
export function reduceRatio(ringTeeth: number, rollingTeeth: number): { p: number; q: number } {
  const g = gcd(ringTeeth, rollingTeeth);
  return { p: ringTeeth / g, q: rollingTeeth / g };
}

/**
 * Petal count:
 * inside (R−r)/gcd = p−q; outside (R+r)/gcd = p+q
 */
export function petals(ringTeeth: number, rollingTeeth: number, mode: 'inside' | 'outside'): number {
  const { p, q } = reduceRatio(ringTeeth, rollingTeeth);
  return mode === 'inside' ? p - q : p + q;
}

/**
 * Inside-mesh initial phase: makes the rolling gear tooth tip point at the nearest ring gear valley center when t=0.
 * Rolling center at (R−r, 0), tooth tip direction relative to the rolling center θ = spin + 0.5·stepRoll.
 * The tooth tip's polar angle (ring center as origin) must equal the valley center direction φ = (j+1)·stepRing:
 *   sin(θ − φ) = sin(φ)·(R−r)/(r+toothDepth)   (rolling-center eccentricity correction)
 * Take the adjacent valley centers and pick the solution that minimizes |spin|. Outside (no outer teeth) needs no offset.
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

/** Validate a combination: in inside mode the rolling teeth must be fewer than the ring teeth */
export function validateGears(ringTeeth: number, rollingTeeth: number, mode: 'inside' | 'outside'): string | null {
  if (!Number.isInteger(ringTeeth) || ringTeeth < 2) return 'ring teeth must be an integer of at least 2';
  if (!Number.isInteger(rollingTeeth) || rollingTeeth < 1) return 'rolling teeth must be an integer of at least 1';
  if (mode === 'inside' && rollingTeeth >= ringTeeth) {
    return 'in inside mode the rolling teeth must be less than the ring teeth';
  }
  return null;
}
