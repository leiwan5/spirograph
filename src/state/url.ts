import type { AppState, Pen } from '../types';
import { getState, setPens, setState } from './store';

/**
 * URL query 参数格式：
 *   ring=72&rolling=30&mode=inside
 *   &pen=40,e63946,2.5&pen=75,1d6fa5,2   （每支笔一个 pen 参数，可重复）
 *   &pen=40,e63946,2.5,1d6fa5,f4a261     （3-6 段：附加 1-3 个渐变色，总色数 ≤4）
 *   &bg=ffffff&speed=1&scale=auto&gears=1
 * 颜色一律使用不带 # 的 6 位 hex（避免 # 截断 query）。
 */

/** 序列化状态 → query string（不含 ?） */
export function serializeState(s: AppState): string {
  const p = new URLSearchParams();
  p.set('ring', String(s.ringTeeth));
  p.set('rolling', String(s.rollingTeeth));
  p.set('mode', s.mode);
  for (const pen of s.pens) {
    const parts = [pen.hole, pen.color.replace('#', '').toLowerCase(), pen.width];
    if (pen.gradient.length > 0) {
      // 渐变起点/长度/循环非默认时用新格式（start,length[,loop] 置于色前），否则旧格式（纯色段）
      if (pen.gradientStart !== 0 || pen.gradientLength !== 100 || pen.gradientLoop) {
        parts.push(String(pen.gradientStart), String(pen.gradientLength));
        if (pen.gradientLoop) parts.push('1');
      }
      for (const c of pen.gradient.slice(0, 3)) parts.push(c.replace('#', '').toLowerCase());
    }
    p.append('pen', parts.join(','));
  }
  p.set('bg', s.background.replace('#', '').toLowerCase());
  p.set('speed', String(s.speed));
  p.set('scale', s.scaleMode);
  p.set('gears', s.showGears ? '1' : '0');
  return p.toString();
}

/** URL 解析出的状态补丁（笔不含 id，由 store 分配） */
export type UrlPatch = Partial<Omit<AppState, 'pens'>> & { pens?: Array<Omit<Pen, 'id'>> };

/** 解析 query string → 状态补丁（非法值一律忽略，不抛错） */
export function parseState(search: string): UrlPatch {
  const p = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const patch: UrlPatch = {};

  const ring = Number(p.get('ring'));
  if (Number.isInteger(ring) && ring >= 40 && ring <= 240) patch.ringTeeth = ring;

  const rolling = Number(p.get('rolling'));
  if (Number.isInteger(rolling) && rolling >= 8 && rolling <= 96) patch.rollingTeeth = rolling;

  const mode = p.get('mode');
  if (mode === 'inside' || mode === 'outside') patch.mode = mode;

  const pens = p
    .getAll('pen')
    .map(parsePen)
    .filter((x): x is Omit<Pen, 'id'> => x !== null);
  if (pens.length > 0) patch.pens = pens;

  const bg = p.get('bg');
  if (bg && /^[0-9a-fA-F]{6}$/.test(bg)) patch.background = '#' + bg.toLowerCase();

  const speed = Number(p.get('speed'));
  if (Number.isFinite(speed) && speed >= 0.1 && speed <= 10) {
    patch.speed = Math.round(speed * 10) / 10;
  }

  const scale = p.get('scale');
  if (scale === 'auto' || scale === 'fixed') patch.scaleMode = scale;

  const gears = p.get('gears');
  if (gears === '1' || gears === 'true') patch.showGears = true;
  else if (gears === '0' || gears === 'false') patch.showGears = false;

  return patch;
}

function parsePen(raw: string): Omit<Pen, 'id'> | null {
  const parts = raw.split(',');
  // 3 段单色；4-6 段旧渐变格式（全为颜色）；7-8 段新格式（start,length,颜色...）
  if (parts.length < 3 || parts.length > 8) return null;
  const hole = Number(parts[0]);
  const colorRaw = parts[1];
  const width = Number(parts[2]);
  if (!Number.isInteger(hole) || hole < 0 || hole > 100) return null;
  if (!/^[0-9a-fA-F]{6}$/.test(colorRaw)) return null;
  if (!Number.isFinite(width) || width < 0.5 || width > 8) return null;

  let gradientStart = 0;
  let gradientLength = 100;
  let gradientLoop = false;
  let colorParts: string[] = parts.slice(3);
  // 新格式（6-9 段）：hole,color,width,start,length[,loop],color2[,color3[,color4]]
  // 判定：第 4、5 段均为 0-100 数字（旧格式该位置是 hex 颜色，非数字）
  const isNum = (v: string) => /^\d+(\.\d+)?$/.test(v);
  if (parts.length >= 6 && isNum(parts[3]) && isNum(parts[4])) {
    const s = Number(parts[3]);
    const l = Number(parts[4]);
    if (s < 0 || s > 100 || l < 0 || l > 100) return null;
    gradientStart = s;
    gradientLength = l;
    // 第 6 段为 '0'/'1' → 循环标志（颜色从第 7 段开始）；否则为颜色
    if (parts.length >= 7 && (parts[5] === '0' || parts[5] === '1')) {
      gradientLoop = parts[5] === '1';
      colorParts = parts.slice(6);
    } else {
      colorParts = parts.slice(5);
    }
  }
  if (colorParts.length > 3) return null; // 附加色最多 3 个
  const gradient: string[] = [];
  for (const c of colorParts) {
    if (!/^[0-9a-fA-F]{6}$/.test(c)) return null;
    gradient.push('#' + c.toLowerCase());
  }
  return { hole, color: '#' + colorRaw.toLowerCase(), gradient, gradientStart, gradientLength, gradientLoop, width };
}

/** 页面加载时应用 URL 参数（须在 buildPanel 之前调用） */
export function applyUrlParams(): void {
  if (typeof location === 'undefined') return;
  const patch = parseState(location.search);
  if (Object.keys(patch).length === 0) return;

  // 内切时滚动齿数必须小于环形齿数（夹取）
  const mode = patch.mode ?? getState().mode;
  const ring = patch.ringTeeth ?? getState().ringTeeth;
  const rolling = patch.rollingTeeth ?? getState().rollingTeeth;
  const rollingClamped = mode === 'inside' && rolling >= ring ? ring - 1 : rolling;

  const { pens, ...rest } = patch;
  if (Object.keys(rest).length > 0) setState({ ...rest, rollingTeeth: rollingClamped });
  if (pens && pens.length > 0) setPens(pens);
}

/** 生成当前状态的分享链接（完整 query） */
export function shareUrl(): string {
  return location.origin + location.pathname + '?' + serializeState(getState());
}

/** 状态变化 → 防抖同步地址栏（replaceState，不产生历史记录） */
export function syncUrl(): void {
  if (typeof window === 'undefined' || typeof history === 'undefined') return;
  window.clearTimeout(syncTimer);
  syncTimer = window.setTimeout(() => {
    const qs = serializeState(getState());
    history.replaceState(null, '', location.pathname + '?' + qs);
  }, 150);
}

let syncTimer = 0;
