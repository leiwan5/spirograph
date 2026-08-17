/**
 * 语言切换（web demo UI 层）：默认英文，localStorage 持久化。
 * 库核心（@spirograph/core）不含任何文案，语言纯属 demo 展示层。
 */

export type Lang = 'en' | 'zh';

const STORAGE_KEY = 'spirograph-lang';

type Vars = Record<string, string | number>;

/** 用 {name} 占位符替换变量 */
function interpolate(s: string, vars?: Vars): string {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

const en = {
  appTitleSub: 'Generator',
  // 头部语言切换
  langEn: 'EN',
  langZh: '中文',
  // 绘制模式
  sectionMode: 'Drawing Mode',
  modeInside: 'Inside (in ring)',
  modeOutside: 'Outside (around ring)',
  modeInsideTag: 'inside',
  modeOutsideTag: 'outside',
  // 齿轮
  sectionRing: 'Ring Gear',
  sectionRolling: 'Rolling Gear',
  // 笔
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
  // 预设
  sectionPresets: 'Presets',
  presetTitle: '{ring}-tooth ring × {rolling} gear, {mode}',
  // 缩放
  sectionScale: 'Canvas Scale',
  scaleAuto: 'Fixed image',
  scaleFixed: 'Fixed ring',
  scaleAutoTitle: 'Image size fixed: pattern always fills the canvas; resizes with gear/hole changes',
  scaleFixedTitle: 'Ring size fixed: ring stays constant size on canvas, pattern drawn at true scale inside; hole changes do not affect other pens',
  // 背景/齿轮/尺寸（设置 modal）
  canvasBackground: 'Canvas background',
  showGears: 'Show gears (pens drawn in sequence)',
  imgSize: 'Image size',
  // 操作（图标用 Font Awesome，文案放 title）
  playTitle: 'Play drawing',
  pauseTitle: 'Pause',
  resumeTitle: 'Resume',
  randomTitle: 'Random inspiration',
  exportPng: 'PNG',
  exportPngTitle: 'Export PNG',
  exportSvg: 'SVG',
  exportSvgTitle: 'Export SVG',
  copyImageLinkTitle: 'Copy image link',
  // 动画模式（浮动工具栏）
  animModeTitle: 'Animation mode',
  animModeExitTitle: 'Exit animation mode',
  speedDownTitle: 'Slower',
  speedUpTitle: 'Faster',
  // 设置 modal
  settingsTitle: 'Settings',
  settingsCloseTitle: 'Close settings',
  // 信息区
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
  randomTitle: '随机灵感',
  exportPng: 'PNG',
  exportPngTitle: '导出 PNG',
  exportSvg: 'SVG',
  exportSvgTitle: '导出 SVG',
  copyImageLinkTitle: '复制图片链接',
  // 动画模式（浮动工具栏）
  animModeTitle: '动画模式',
  animModeExitTitle: '退出动画模式',
  speedDownTitle: '减速',
  speedUpTitle: '加速',
  // 设置 modal
  settingsTitle: '设置',
  settingsCloseTitle: '关闭设置',
  infoRatio: '化简比',
  infoPetals: '花瓣数',
  infoTurns: '闭合转数',
  infoSamplesRow: '单笔采样 <b>{n}</b> 点',
  downsampled: '（已降采样）',
};

type Dict = typeof en;

/** 文案 key（en 字典的键全集；zh 与之严格一致） */
export type I18nKey = keyof Dict;

let currentLang: Lang = readStoredLang();

function readStoredLang(): Lang {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'zh' ? 'zh' : 'en'; // 默认英文
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
    /* 隐私模式等场景忽略 */
  }
  for (const fn of listeners) fn();
}

export function subscribeLang(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** 取当前语言文案（{n} 变量插值） */
export function t(key: I18nKey, vars?: Vars): string {
  const dict: Dict = currentLang === 'en' ? en : (zh as Dict);
  return interpolate(dict[key], vars);
}