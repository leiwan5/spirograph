import type { AppState, Pen } from '@spirograph/core';
import { DEFAULT_STATE } from '@spirograph/core';

let state: AppState = {
  ...DEFAULT_STATE,
  pens: DEFAULT_STATE.pens.map((p) => ({ ...p, colors: [...p.colors] })),
};
let nextPenId = 100;

type Listener = () => void;
const listeners = new Set<Listener>();

export function getState(): AppState {
  return state;
}

export function setState(patch: Partial<AppState>): void {
  state = { ...state, ...patch };
  emit();
}

export function setPen(id: number, patch: Partial<Pen>): void {
  state = { ...state, pens: state.pens.map((p) => (p.id === id ? { ...p, ...patch } : p)) };
  emit();
}

/** Replace the whole pen list (preset/random), auto-assign new ids; empty lists are rejected (always keep at least one pen) */
export function setPens(pens: Array<Omit<Pen, 'id'>>): void {
  if (pens.length === 0) return;
  state = { ...state, pens: pens.map((p) => ({ ...p, id: nextPenId++ })) };
  emit();
}

export function addPen(patch?: Partial<Pen>): void {
  const pen: Pen = {
    id: nextPenId++,
    hole: 60,
    colors: [nextColor(state.pens.length)],
    spacing: 20,
    width: 2,
    ...patch,
  };
  state = { ...state, pens: [...state.pens, pen] };
  emit();
}

export function removePen(id: number): void {
  if (state.pens.length <= 1) return; // always keep at least one pen
  state = { ...state, pens: state.pens.filter((p) => p.id !== id) };
  emit();
}

function nextColor(index: number): string {
  const palette = [
    '#e63946', '#1d6fa5', '#f4a261', '#2a9d8f', '#9b5de5',
    '#f15bb5', '#00bbf9', '#d9a404', '#3a86ff', '#ff7b00',
  ];
  return palette[index % palette.length];
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(): void {
  for (const fn of listeners) fn();
}

// Exposed to verification/debug scripts (does not affect functionality)
if (typeof window !== 'undefined') {
  (window as unknown as { __dshStore?: unknown }).__dshStore = { getState, setState, subscribe };
}
