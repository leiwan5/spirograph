import type { Pen } from '@spirograph/core';
import { setPens, setState } from '../state/store';

export const RING_PRESETS = [72, 96, 144, 192];
export const ROLLING_PRESETS = [24, 30, 32, 45, 48, 52, 56, 60, 63, 64, 72];

export const PALETTE = [
  '#e63946', '#1d6fa5', '#f4a261', '#2a9d8f', '#9b5de5',
  '#f15bb5', '#00bbf9', '#d9a404', '#3a86ff', '#ff7b00',
];

export interface ComboPreset {
  name: string;
  /** 英文名（默认语言为英文） */
  nameEn: string;
  mode: 'inside' | 'outside';
  ring: number;
  rolling: number;
  pens: Array<{ hole: number; colors: string[]; width: number }>;
}

/** 经典齿轮组合预设（含多笔配色） */
export const COMBO_PRESETS: ComboPreset[] = [
  {
    name: '经典星花 72×30', nameEn: 'Classic Star 72×30',
    mode: 'inside', ring: 72, rolling: 30,
    pens: [
      { hole: 45, colors: ['#e63946'], width: 2.5 },
      { hole: 80, colors: ['#1d6fa5'], width: 2 },
    ],
  },
  {
    name: '三叶草 72×24', nameEn: 'Clover 72×24',
    mode: 'inside', ring: 72, rolling: 24,
    pens: [
      { hole: 55, colors: ['#2a9d8f'], width: 2.5 },
      { hole: 95, colors: ['#f4a261'], width: 2 },
    ],
  },
  {
    name: '繁花 96×63', nameEn: 'Blossom 96×63',
    mode: 'inside', ring: 96, rolling: 63,
    pens: [
      { hole: 35, colors: ['#f15bb5'], width: 2.5 },
      { hole: 65, colors: ['#9b5de5'], width: 2 },
    ],
  },
  {
    name: '蛛网 144×60', nameEn: 'Spiderweb 144×60',
    mode: 'inside', ring: 144, rolling: 60,
    pens: [
      { hole: 40, colors: ['#3a86ff'], width: 1.8 },
      { hole: 70, colors: ['#00bbf9'], width: 1.5 },
      { hole: 90, colors: ['#d9a404'], width: 1.5 },
    ],
  },
  {
    name: '外切花环 48×24', nameEn: 'Garland 48×24',
    mode: 'outside', ring: 48, rolling: 24,
    pens: [
      { hole: 60, colors: ['#ff7b00'], width: 2.5 },
      { hole: 100, colors: ['#e63946'], width: 2 },
    ],
  },
  {
    name: '星芒 96×32', nameEn: 'Starburst 96×32',
    mode: 'inside', ring: 96, rolling: 32,
    pens: [
      { hole: 100, colors: ['#d9a404'], width: 2.5 },
      { hole: 60, colors: ['#1d6fa5'], width: 2 },
    ],
  },
  {
    name: '涟漪 192×72', nameEn: 'Ripples 192×72',
    mode: 'inside', ring: 192, rolling: 72,
    pens: [
      { hole: 50, colors: ['#2a9d8f'], width: 2 },
      { hole: 90, colors: ['#f15bb5'], width: 1.5 },
    ],
  },
];

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

/** 随机灵感：随机齿数 + 孔洞 + 配色（避开退化组合） */
export function randomSettings(): void {
  const mode: 'inside' | 'outside' = Math.random() < 0.75 ? 'inside' : 'outside';
  const ring = randInt(40, 180);
  let rolling: number;
  if (mode === 'inside') rolling = randInt(8, Math.min(96, ring - 1));
  else rolling = randInt(8, 96);
  const penCount = randInt(1, 4);
  const pens: Array<Omit<Pen, 'id'>> = [];
  for (let i = 0; i < penCount; i++) {
    const color = PALETTE[randInt(0, PALETTE.length - 1)];
    pens.push({
      hole: randInt(20, 100),
      colors: [color],
      spacing: 20,
      width: round1(1 + Math.random() * 3),
    });
  }
  setState({
    mode,
    ringTeeth: ring,
    rollingTeeth: rolling,
    background: Math.random() < 0.12 ? '#1b1b2f' : '#ffffff',
  });
  setPens(pens);
}
