import { parseState, serializeState } from '@spirograph/core';
import { getState, setPens, setState } from './store';

/**
 * URL query parameter format (supported by the core query codec, see @spirograph/core):
 *   ring=72&rolling=30&mode=inside
 *   &pen=40,e63946,2.5&pen=75,1d6fa5,2   (one pen parameter per pen, repeatable)
 *   &pen=40,e63946,2.5,1d6fa5,f4a261     (3-6 fields: 1-3 extra gradient colors, total colors ≤4)
 *   &bg=ffffff&speed=1&scale=auto&gears=1
 * Colors always use 6-digit hex without # (to avoid # truncating the query).
 * parseState/serializeState live in the core library (pure); only DOM-related parts stay here: apply/sync/share link.
 */

/** Apply URL params on page load (must be called before buildPanel) */
export function applyUrlParams(): void {
  if (typeof location === 'undefined') return;
  const patch = parseState(location.search);
  if (Object.keys(patch).length === 0) return;

  // When inside mode, the rolling teeth must be less than the ring teeth (clamped)
  const mode = patch.mode ?? getState().mode;
  const ring = patch.ringTeeth ?? getState().ringTeeth;
  const rolling = patch.rollingTeeth ?? getState().rollingTeeth;
  const rollingClamped = mode === 'inside' && rolling >= ring ? ring - 1 : rolling;

  const { pens, ...rest } = patch;
  if (Object.keys(rest).length > 0) setState({ ...rest, rollingTeeth: rollingClamped });
  if (pens && pens.length > 0) setPens(pens);
}

/** Generate the share link for the current state (full query) */
export function shareUrl(): string {
  return location.origin + location.pathname + '?' + serializeState(getState());
}

/** State change → debounce-sync the address bar (replaceState, no history entries) */
export function syncUrl(): void {
  if (typeof window === 'undefined' || typeof history === 'undefined') return;
  window.clearTimeout(syncTimer);
  syncTimer = window.setTimeout(() => {
    const qs = serializeState(getState());
    history.replaceState(null, '', location.pathname + '?' + qs);
  }, 150);
}

let syncTimer = 0;
