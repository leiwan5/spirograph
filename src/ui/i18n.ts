/**
 * Language switching (web demo UI layer): default English, persisted in localStorage.
 * The core library (@spirograph/core) contains no copy; language is purely a demo display-layer concern.
 */

export type Lang = 'en' | 'zh';

const STORAGE_KEY = 'spirograph-lang';

type Vars = Record<string, string | number>;

/** Replace variables using {name} placeholders */
function interpolate(s: string, vars?: Vars): string {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

const en = {
  appTitleSub: 'Generator',
  // header language switcher
  langEn: 'EN',
  langZh: '中文',
  // drawing mode
  sectionMode: 'Drawing Mode',
  modeInside: 'Inside (in ring)',
  modeOutside: 'Outside (around ring)',
  modeInsideTag: 'inside',
  modeOutsideTag: 'outside',
  // gears
  sectionRing: 'Ring Gear',
  sectionRolling: 'Rolling Gear',
  // pens
  sectionPens: 'Pens (stacked)',
  addPenTitle: 'Add pen',
  penLabel: 'Pen {n}',
  penDelete: 'Delete this pen',
  penHole: 'Hole (% of rolling radius)',
  penColors: 'Colors (1 = solid, more = gradient)',
  penColor: 'Color',
  penWidth: 'Width (px)',
  penGradSpacing: 'Spacing (switch every N%)',
  gradSlotTitle: 'color at position {n}×spacing',
  addColor: 'Add color',
  // presets
  sectionPresets: 'Presets',
  presetTitle: '{ring}-tooth ring × {rolling} gear, {mode}',
  // scale
  sectionScale: 'Canvas Scale',
  scaleAuto: 'Fixed image',
  scaleFixed: 'Fixed ring',
  scaleAutoTitle: 'Image size fixed: pattern always fills the canvas; resizes with gear/hole changes',
  scaleFixedTitle: 'Ring size fixed: ring stays constant size on canvas, pattern drawn at true scale inside; hole changes do not affect other pens',
  // background/gears/size (settings modal)
  canvasBackground: 'Canvas background',
  showGears: 'Show gears (pens drawn in sequence)',
  imgSize: 'Image size',
  // actions (icons use Font Awesome, text in title)
  playTitle: 'Play drawing',
  pauseTitle: 'Pause',
  resumeTitle: 'Resume',
  playModeSimultaneousTitle: 'Draw all pens together',
  playModeSequentialTitle: 'Draw one pen at a time',
  randomTitle: 'Random inspiration',
  exportPng: 'PNG',
  exportPngTitle: 'Export PNG',
  exportSvg: 'SVG',
  exportSvgTitle: 'Export SVG',
  copyImageLinkTitle: 'Copy image link',
  // floating toolbar (always visible)
  stopTitle: 'Stop',
  speedDownTitle: 'Slower',
  speedUpTitle: 'Faster',
  // settings modal
  settingsTitle: 'Settings',
  settingsCloseTitle: 'Close settings',
  // info area
  infoRatio: 'Ratio',
  infoPetals: 'Petals',
  infoTurns: 'Turns',
  infoSamplesRow: '<b>{n}</b> points per pen',
  downsampled: ' (downsampled)',
} as const;

const zh: Record<keyof typeof en, string> = {
  appTitleSub: '生成器',
  langEn: 'EN',
  langZh: '中文',
  sectionMode: '绘制模式',
  modeInside: '内切（齿轮环内）',
  modeOutside: '外切（齿轮环外）',
  modeInsideTag: '内切',
  modeOutsideTag: '外切',
  sectionRing: '环形齿轮',
  sectionRolling: '滚动齿轮',
  sectionPens: '笔（多支笔叠加绘制）',
  addPenTitle: '添加笔',
  penLabel: '笔 {n}',
  penDelete: '删除此笔',
  penHole: '孔洞位置（%滚动半径）',
  penColors: '颜色（1 个=单色，多个=渐变）',
  penColor: '颜色',
  penWidth: '粗细（px）',
  penGradSpacing: '间隔（每多少 % 切换一次颜色）',
  gradSlotTitle: '{n}×间隔 处位置颜色',
  addColor: '添加颜色',
  sectionPresets: '预设组合',
  presetTitle: '{ring}齿环 × {rolling}齿轮，{mode}',
  sectionScale: '画布缩放',
  scaleAuto: '固定图像大小',
  scaleFixed: '环固定大小',
  scaleAutoTitle: '图像尺寸固定：图案始终充满画布；调孔洞/齿轮时整图会缩放适配',
  scaleFixedTitle: '环尺寸固定：齿轮环在画布上大小恒定，图案按真实比例画在环内；调孔洞不影响任何笔',
  canvasBackground: '画布背景',
  showGears: '显示齿轮（多笔分步绘制）',
  imgSize: '图片尺寸',
  playTitle: '播放绘制',
  pauseTitle: '暂停',
  resumeTitle: '继续',
  playModeSimultaneousTitle: '多笔同时播放',
  playModeSequentialTitle: '单笔依次播放',
  randomTitle: '随机灵感',
  exportPng: 'PNG',
  exportPngTitle: '导出 PNG',
  exportSvg: 'SVG',
  exportSvgTitle: '导出 SVG',
  copyImageLinkTitle: '复制图片链接',
  // floating toolbar (always visible)
  stopTitle: '停止',
  speedDownTitle: '减速',
  speedUpTitle: '加速',
  // settings modal
  settingsTitle: '设置',
  settingsCloseTitle: '关闭设置',
  infoRatio: '化简比',
  infoPetals: '花瓣数',
  infoTurns: '闭合转数',
  infoSamplesRow: '单笔采样 <b>{n}</b> 点',
  downsampled: '（已降采样）',
};

type Dict = typeof en;

/** Copy keys (the full key set of the en dict; zh mirrors it exactly) */
export type I18nKey = keyof Dict;

let currentLang: Lang = readStoredLang();

function readStoredLang(): Lang {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'zh' ? 'zh' : 'en'; // default English
  } catch {
    return 'en';
  }
}

const listeners = new Set<() => void>();

export function getLang(): Lang {
  return currentLang;
}

export function setLang(lang: Lang): void {
  if (lang === currentLang) return;
  currentLang = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* e.g. ignored in private mode */
  }
  for (const fn of listeners) fn();
}

export function subscribeLang(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Take the current language copy ({n} variable interpolation) */
export function t(key: I18nKey, vars?: Vars): string {
  const dict: Dict = currentLang === 'en' ? en : (zh as Dict);
  return interpolate(dict[key], vars);
}