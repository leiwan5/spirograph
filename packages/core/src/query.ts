import type { AppState, Pen } from './types.js';

/**
 * URL query parameter format (identical to the web app's share links, image endpoints, and CLI):
 *   ring=72&rolling=30&mode=inside
 *   &pen=40,2.5,e63946                   solid pen: hole,width,color1
 *   &pen=40,2.5,10,e63946,1d6fa5        multi-color pen: hole,width,spacing,color1[,color2[,color3[,color4]]]
 *   (exactly 1 color = solid; ≥ 2 colors = gradient. Spacing comes before the color group, unambiguous with 6-digit hex)
 *   &bg=ffffff&speed=1&scale=auto&gears=1
 * Colors always use 6-digit hex without # (to avoid # truncating the query).
 *
 * This module uses a built-in pure-string query codec (no dependency on the global URL parser),
 * guaranteeing identical behavior and zero polyfills across Node / browser / React Native (Hermes).
 */

/** URL decode (%XX → char, + → space); serialized values are all safe ASCII (digits/hex/commas), no encoding needed */
function decodeComponent(s: string): string {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '+') {
      out += ' ';
    } else if (ch === '%') {
      const hex = s.slice(i + 1, i + 3);
      if (/^[0-9a-fA-F]{2}$/.test(hex)) {
        out += String.fromCharCode(parseInt(hex, 16));
        i += 2;
      } else {
        out += ch;
      }
    } else {
      out += ch;
    }
  }
  return out;
}

/** Parse a query string → array of key/value pairs (preserves duplicate keys and original order) */
function parseQuery(search: string): Array<{ key: string; value: string }> {
  const s = search.startsWith('?') ? search.slice(1) : search;
  if (s === '') return [];
  return s.split('&').filter((kv) => kv !== '').map((kv) => {
    const eq = kv.indexOf('=');
    if (eq === -1) return { key: decodeComponent(kv), value: '' };
    return { key: decodeComponent(kv.slice(0, eq)), value: decodeComponent(kv.slice(eq + 1)) };
  });
}

/** Take a single query param value (first match; null if absent), used by image endpoints / CLI */
export function getQueryValue(search: string, key: string): string | null {
  return parseQuery(search).find((p) => p.key === key)?.value ?? null;
}

/** Serialize state → query string (without ?), stable key order */
export function serializeState(s: AppState): string {
  const parts: string[] = [];
  parts.push('ring=' + String(s.ringTeeth));
  parts.push('rolling=' + String(s.rollingTeeth));
  parts.push('mode=' + s.mode);
  for (const pen of s.pens) {
    const penParts: (number | string)[] = [pen.hole, pen.width];
    if (pen.colors.length > 1) {
      // multi-color (gradient): hole,width,spacing,c1[,c2[,c3[,c4]]]
      penParts.push(String(pen.spacing));
      for (const c of pen.colors) penParts.push(c.replace('#', '').toLowerCase());
    } else {
      // solid: hole,width,c1
      penParts.push((pen.colors[0] ?? '#000000').replace('#', '').toLowerCase());
    }
    parts.push('pen=' + penParts.join(','));
  }
  parts.push('bg=' + s.background.replace('#', '').toLowerCase());
  parts.push('speed=' + String(s.speed));
  parts.push('scale=' + s.scaleMode);
  parts.push('gears=' + (s.showGears ? '1' : '0'));
  return parts.join('&');
}

/** State patch parsed from a URL (pens have no id; assigned by the store) */
export type UrlPatch = Partial<Omit<AppState, 'pens'>> & { pens?: Array<Omit<Pen, 'id'>> };

/** Parse a query string → state patch (invalid values are always ignored, never throw) */
export function parseState(search: string): UrlPatch {
  const pairs = parseQuery(search);
  const get = (k: string): string | undefined => pairs.find((p) => p.key === k)?.value;
  const getAll = (k: string): string[] => pairs.filter((p) => p.key === k).map((p) => p.value);
  const patch: UrlPatch = {};

  const ring = Number(get('ring'));
  if (Number.isInteger(ring) && ring >= 40 && ring <= 240) patch.ringTeeth = ring;

  const rolling = Number(get('rolling'));
  if (Number.isInteger(rolling) && rolling >= 8 && rolling <= 96) patch.rollingTeeth = rolling;

  const mode = get('mode');
  if (mode === 'inside' || mode === 'outside') patch.mode = mode;

  const pens = getAll('pen')
    .map(parsePen)
    .filter((x): x is Omit<Pen, 'id'> => x !== null);
  if (pens.length > 0) patch.pens = pens;

  const bg = get('bg');
  if (bg && /^[0-9a-fA-F]{6}$/.test(bg)) patch.background = '#' + bg.toLowerCase();

  const speed = Number(get('speed'));
  if (Number.isFinite(speed) && speed >= 0.1 && speed <= 10) {
    patch.speed = Math.round(speed * 10) / 10;
  }

  const scale = get('scale');
  if (scale === 'auto' || scale === 'fixed') patch.scaleMode = scale;

  const gears = get('gears');
  if (gears === '1' || gears === 'true') patch.showGears = true;
  else if (gears === '0' || gears === 'false') patch.showGears = false;

  return patch;
}

function parsePen(raw: string): Omit<Pen, 'id'> | null {
  const parts = raw.split(',');
  // 3-field solid: hole,width,c1
  // 4-7-field multi-color: hole,width,spacing,c1[,c2[,c3[,c4]]]
  if (parts.length < 3 || parts.length > 7) return null;
  const hole = Number(parts[0]);
  const width = Number(parts[1]);
  if (!Number.isInteger(hole) || hole < 0 || hole > 100) return null;
  if (!Number.isFinite(width) || width < 0.5 || width > 8) return null;

  let spacing = 20;
  let colorParts = parts.slice(2);
  if (parts.length >= 4) {
    // multi-color: spacing must be a 1-100 number (unambiguous with 6-digit hex colors)
    if (!/^\d+(\.\d+)?$/.test(parts[2])) return null;
    const sp = Number(parts[2]);
    if (!(sp >= 1 && sp <= 100)) return null;
    spacing = sp;
    colorParts = parts.slice(3);
  }
  if (colorParts.length < 1 || colorParts.length > 4) return null;
  const colors: string[] = [];
  for (const c of colorParts) {
    if (!/^[0-9a-fA-F]{6}$/.test(c)) return null;
    colors.push('#' + c.toLowerCase());
  }
  return { hole, colors, spacing, width };
}
