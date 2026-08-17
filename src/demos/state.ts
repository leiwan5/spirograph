// Demo helpers shared by the Svelte & React landing pages: build a SpirographState (URL-aware) and mutate it.
import type { SpirographState, Pen } from '@spirograph/core';
import { DEFAULT_STATE, parseState } from '@spirograph/core';

/** Unique pen ids for demo state (the library renderer caches curves by pen id + hole). */
let nextId = 1000;
function withIds(pens: Array<Omit<Pen, 'id'>>): Pen[] {
  return pens.map((p) => ({ ...p, id: nextId++ }));
}

/** Build a fresh demo SpirographState, seeded from the URL query (same params as the main app) or defaults. */
export function buildDemoState(): SpirographState {
  const hasQuery = typeof location !== 'undefined' && location.search.length > 1;
  const patch = hasQuery ? parseState(location.search) : {};
  const pens =
    patch.pens && patch.pens.length > 0 ? patch.pens : DEFAULT_STATE.pens.map((p) => ({ ...p }));
  return {
    mode: patch.mode ?? DEFAULT_STATE.mode,
    ringTeeth: patch.ringTeeth ?? DEFAULT_STATE.ringTeeth,
    rollingTeeth: patch.rollingTeeth ?? DEFAULT_STATE.rollingTeeth,
    pens: withIds(pens),
    background: patch.background ?? DEFAULT_STATE.background,
    speed: patch.speed ?? DEFAULT_STATE.speed,
    scaleMode: patch.scaleMode ?? DEFAULT_STATE.scaleMode,
    showGears: patch.showGears ?? DEFAULT_STATE.showGears,
  };
}

/** Clamp inside-mode so rolling < ring (mirrors the main app). */
export function clampInside(state: Pick<SpirographState, 'mode' | 'ringTeeth' | 'rollingTeeth'>): SpirographState['rollingTeeth'] {
  if (state.mode === 'inside' && state.rollingTeeth >= state.ringTeeth) {
    return state.ringTeeth - 1;
  }
  return state.rollingTeeth;
}

/** Apply a partial patch to a demo state, clamping inside-mode rolling < ring. */
export function applyPatch(
  state: SpirographState,
  patch: Partial<SpirographState>,
): SpirographState {
  const merged = { ...state, ...patch };
  const mode = merged.mode;
  const ring = merged.ringTeeth;
  let rolling = merged.rollingTeeth;
  if (mode === 'inside' && rolling >= ring) rolling = Math.max(8, ring - 1);
  else rolling = Math.min(96, rolling);
  return {
    ...merged,
    mode,
    ringTeeth: Math.min(240, Math.max(40, ring)),
    rollingTeeth: rolling,
    pens: merged.pens.map((p) => ({ ...p })),
  };
}

/** Random inspiration for the demo (teeth + solid color pens + background). */
export function randomize(state: SpirographState): SpirographState {
  const mode: SpirographState['mode'] = Math.random() < 0.75 ? 'inside' : 'outside';
  const ring = 40 + Math.floor(Math.random() * 140);
  const rollingRaw = mode === 'inside' ? 8 + Math.floor(Math.random() * Math.min(88, ring - 9)) : 8 + Math.floor(Math.random() * 88);
  const count = 1 + Math.floor(Math.random() * 2);
  const palette = ['#e63946', '#1d6fa5', '#f4a261', '#2a9d8f', '#9b5de5', '#f15bb5', '#00bbf9', '#d9a404', '#3a86ff', '#ff7b00'];
  const pens = Array.from({ length: count }, () => ({
    id: nextId++,
    hole: 20 + Math.floor(Math.random() * 80),
    colors: [palette[Math.floor(Math.random() * palette.length)]],
    spacing: 20,
    width: Math.round((1 + Math.random() * 3) * 10) / 10,
  }));
  return {
    ...state,
    mode,
    ringTeeth: ring,
    rollingTeeth: rollingRaw,
    background: Math.random() < 0.12 ? '#1b1b2f' : '#ffffff',
    pens,
  };
}
