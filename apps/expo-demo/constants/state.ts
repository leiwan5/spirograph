import type { SpirographState, Pen } from '@spirograph/react-native';

/** Default demo state — the initial pattern shown on launch. */
export const DEMO_STATE: SpirographState = {
  mode: 'inside',
  ringTeeth: 72,
  rollingTeeth: 30,
  pens: [
    { id: 1, hole: 40, colors: ['#e63946'], spacing: 20, width: 4 },
    { id: 2, hole: 75, colors: ['#4cc9f0'], spacing: 20, width: 3.5 },
    { id: 3, hole: 88, colors: ['#f4a261'], spacing: 20, width: 3 },
  ],
  background: '#111827',
  speed: 1,
  scaleMode: 'auto',
  showGears: false,
};

/** A palette of colors for pen selection. */
export const PALETTE = [
  '#e63946',
  '#4cc9f0',
  '#f4a261',
  '#2a9d8f',
  '#e9c46a',
  '#9b5de5',
  '#f15bb5',
  '#00bbf9',
  '#ffffff',
  '#a8dadc',
  '#00f5d4',
  '#fee440',
];

/** Background color choices. */
export const BACKGROUNDS = ['#111827', '#000000', '#ffffff', '#1d3557', '#2b2d42', '#233554'];

/** Create a new pen with the next available id. */
export function nextPenId(pens: Pen[]): number {
  return pens.length > 0 ? Math.max(...pens.map((p) => p.id)) + 1 : 1;
}
