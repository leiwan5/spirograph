import type { AppState, Pen } from '../types';

export const DEFAULT_STATE: AppState = {
  mode: 'inside',
  ringTeeth: 72,
  rollingTeeth: 30,
  pens: [
    { id: 1, hole: 40, color: '#e63946', width: 2.5 },
    { id: 2, hole: 75, color: '#1d6fa5', width: 2 },
  ],
  background: '#ffffff',
  speed: 1,
  scaleMode: 'auto',
  showGears: false,
};

let state: AppState = {
  ...DEFAULT_STATE,
  pens: DEFAULT_STATE.pens.map((p) => ({ ...p })),
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

/** 整体替换笔列表（预设/随机用），自动分配新 id */
export function setPens(pens: Array<Omit<Pen, 'id'>>): void {
  state = { ...state, pens: pens.map((p) => ({ ...p, id: nextPenId++ })) };
  emit();
}

export function addPen(patch?: Partial<Pen>): void {
  const pen: Pen = {
    id: nextPenId++,
    hole: 60,
    color: nextColor(state.pens.length),
    width: 2,
    ...patch,
  };
  state = { ...state, pens: [...state.pens, pen] };
  emit();
}

export function removePen(id: number): void {
  if (state.pens.length <= 1) return; // 至少保留一支笔
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

// 暴露给验证/调试脚本（不影响功能）
if (typeof window !== 'undefined') {
  (window as unknown as { __dshStore?: unknown }).__dshStore = { getState, setState, subscribe };
}
