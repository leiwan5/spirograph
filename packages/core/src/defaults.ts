import type { AppState } from './types.js';

/** 默认状态：query 解析、图片端点、CLI 的缺省回退值（与 web 应用初始状态一致） */
export const DEFAULT_STATE: AppState = {
  mode: 'inside',
  ringTeeth: 72,
  rollingTeeth: 30,
  pens: [
    { id: 1, hole: 40, colors: ['#e63946'], spacing: 20, width: 2.5 },
    { id: 2, hole: 75, colors: ['#1d6fa5'], spacing: 20, width: 2 },
  ],
  background: '#ffffff',
  speed: 1,
  scaleMode: 'auto',
  showGears: false,
};
