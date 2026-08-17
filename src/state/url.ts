import { parseState, serializeState } from '@spirograph/core';
import { getState, setPens, setState } from './store';

/**
 * URL query 参数格式（核心 query codec 支持，见 @spirograph/core）：
 *   ring=72&rolling=30&mode=inside
 *   &pen=40,e63946,2.5&pen=75,1d6fa5,2   （每支笔一个 pen 参数，可重复）
 *   &pen=40,e63946,2.5,1d6fa5,f4a261     （3-6 段：附加 1-3 个渐变色，总色数 ≤4）
 *   &bg=ffffff&speed=1&scale=auto&gears=1
 * 颜色一律使用不带 # 的 6 位 hex（避免 # 截断 query）。
 * parseState/serializeState 本体在核心库（纯），此处只保留 DOM 相关：应用/同步/分享链接。
 */

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
