import type { AppState, Pen } from './types.js';

/**
 * URL query 参数格式（与 web 应用分享链接、图片端点、CLI 完全一致）：
 *   ring=72&rolling=30&mode=inside
 *   &pen=40,2.5,e63946                   单色笔：孔洞,粗细,颜色1
 *   &pen=40,2.5,10,e63946,1d6fa5        多色笔：孔洞,粗细,间隔,颜色1[,颜色2[,颜色3[,颜色4]]]
 *   （仅 1 个颜色 = 单色；≥ 2 个颜色 = 渐变。间隔在颜色组前，与 6 位 hex 无歧义）
 *   &bg=ffffff&speed=1&scale=auto&gears=1
 * 颜色一律使用不带 # 的 6 位 hex（避免 # 截断 query）。
 *
 * 本模块使用内置纯字符串 query 编解码器（不依赖全局 URL 解析类），
 * 保证在 Node / 浏览器 / React Native（Hermes）三端行为一致、零 polyfill。
 */

/** URL 解码（%XX → 字符，+ → 空格）；序列化侧值均为安全 ASCII（数字/hex/逗号），无需编码 */
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

/** 解析 query string → 键值对数组（保留重复键与原始顺序） */
function parseQuery(search: string): Array<{ key: string; value: string }> {
  const s = search.startsWith('?') ? search.slice(1) : search;
  if (s === '') return [];
  return s.split('&').filter((kv) => kv !== '').map((kv) => {
    const eq = kv.indexOf('=');
    if (eq === -1) return { key: decodeComponent(kv), value: '' };
    return { key: decodeComponent(kv.slice(0, eq)), value: decodeComponent(kv.slice(eq + 1)) };
  });
}

/** 取单个 query 参数值（首个匹配；无则 null），图片端点/CLI 用 */
export function getQueryValue(search: string, key: string): string | null {
  return parseQuery(search).find((p) => p.key === key)?.value ?? null;
}

/** 序列化状态 → query string（不含 ?），键序稳定 */
export function serializeState(s: AppState): string {
  const parts: string[] = [];
  parts.push('ring=' + String(s.ringTeeth));
  parts.push('rolling=' + String(s.rollingTeeth));
  parts.push('mode=' + s.mode);
  for (const pen of s.pens) {
    const penParts: (number | string)[] = [pen.hole, pen.width];
    if (pen.colors.length > 1) {
      // 多色（渐变）：hole,width,spacing,c1[,c2[,c3[,c4]]]
      penParts.push(String(pen.spacing));
      for (const c of pen.colors) penParts.push(c.replace('#', '').toLowerCase());
    } else {
      // 单色：hole,width,c1
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

/** URL 解析出的状态补丁（笔不含 id，由 store 分配） */
export type UrlPatch = Partial<Omit<AppState, 'pens'>> & { pens?: Array<Omit<Pen, 'id'>> };

/** 解析 query string → 状态补丁（非法值一律忽略，不抛错） */
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
  // 3 段单色：hole,width,c1
  // 4-7 段多色：hole,width,spacing,c1[,c2[,c3[,c4]]]
  if (parts.length < 3 || parts.length > 7) return null;
  const hole = Number(parts[0]);
  const width = Number(parts[1]);
  if (!Number.isInteger(hole) || hole < 0 || hole > 100) return null;
  if (!Number.isFinite(width) || width < 0.5 || width > 8) return null;

  let spacing = 20;
  let colorParts = parts.slice(2);
  if (parts.length >= 4) {
    // 多色：间隔必须是 1-100 的数字（与 6 位 hex 颜色无歧义）
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
