import { describe, it, expect } from 'vitest';
import { sampleCurve } from '@spirograph/core';
import { createFramePlan } from './framePlan.js';
import type { RenderItem } from '@spirograph/core';

function items(count = 3): RenderItem[] {
  return Array.from({ length: count }, (_, i) => ({
    curve: sampleCurve(72, 30, 'inside', 40 + i),
    pen: { id: i + 1, hole: 40 + i, colors: ['#e63946'], spacing: 20, width: 2 },
  }));
}

describe('createFramePlan (frame plan, pure function)', () => {
  it('parallel mode: each pen advances in sync by its own count', () => {
    const [a, b] = items(2);
    const plan = createFramePlan([a, b], 0.5, { step: false });
    expect(plan.penIndex).toBe(-1);
    expect(plan.perPenPoints[0]).toBe(Math.floor(0.5 * a.curve.count));
    expect(plan.perPenPoints[1]).toBe(Math.floor(0.5 * b.curve.count));
    expect(plan.penProgress).toBe(0.5);
  });

  it('step mode: progress maps to the pen index', () => {
    const [a, b, c] = items(3);
    const plan0 = createFramePlan([a, b, c], 0, { step: true });
    expect(plan0.penIndex).toBe(0);
    expect(plan0.perPenPoints[0]).toBe(1);
    expect(plan0.perPenPoints[1]).toBe(0);

    const planMid = createFramePlan([a, b, c], 0.5, { step: true });
    expect(planMid.penIndex).toBe(1);
    expect(planMid.perPenPoints[0]).toBe(a.curve.count); // finished pen draws fully
    expect(planMid.perPenPoints[1]).toBe(Math.floor(0.5 * b.curve.count));
    expect(planMid.perPenPoints[2]).toBe(0);
  });

  it('step mode: all pens draw fully at completion', () => {
    const [a, b] = items(2);
    const plan = createFramePlan([a, b], 1, { step: true });
    expect(plan.penIndex).toBe(1);
    expect(plan.perPenPoints[0]).toBe(a.curve.count);
    expect(plan.perPenPoints[1]).toBe(b.curve.count);
  });

  it('gearT is proportional to the current pen periodTurns (for the gear pose)', () => {
    const [a, b] = items(2);
    const plan = createFramePlan([a, b], 0.5, { step: true });
    // current pen = 1, penProgress decided by computeSteps
    const expectedT = plan.penProgress * 2 * Math.PI * b.curve.periodTurns;
    expect(plan.gearT).toBeCloseTo(expectedT, 10);
  });

  it('clamps progress to [0,1]', () => {
    const [a] = items(1);
    expect(createFramePlan([a], -1).perPenPoints[0]).toBe(1);
    expect(createFramePlan([a], 2).perPenPoints[0]).toBe(a.curve.count);
  });
});
