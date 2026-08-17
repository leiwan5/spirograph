#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import { generatePng, generateSvg } from '@spirograph/core';

export interface CliOptions {
  /** query 参数（与图片端点/分享链接一致），如 ring=72&rolling=30&pen=40,e63946,2.5 */
  params?: string;
  /** 直接给 JSON 形态的 AppState（覆盖 params） */
  json?: string;
  format: 'png' | 'svg';
  size?: number;
}

export interface CliResult {
  format: 'png' | 'svg';
  /** 生成的文件内容（png=Uint8Array / svg=string） */
  data: Uint8Array | string;
  /** 建议文件名 */
  filename: string;
}

const HELP = `spirograph — 万花尺图案生成 CLI（基于 @spirograph/core）

用法:
  spirograph generate --params "ring=72&rolling=30&pen=40,e63946,2.5&pen=75,1d6fa5,2" --format png --size 2048 --out out.png
  spirograph generate --params "…" --format svg --out out.svg
  spirograph generate --json '{"mode":"inside","ringTeeth":72,"rollingTeeth":30,"pens":[{"hole":40,"color":"#e63946","width":2.5}]}' --format png
  spirograph --help

选项:
  --params <query>   query 参数（ring/rolling/mode/pen/bg/scale/speed/gears/size）
  --json <json>      直接提供 AppState JSON（优先于 --params）
  --format <fmt>     png | svg（默认 png）
  --size <n>         png 尺寸 64–4096（默认 1000）
  --out <path>       输出文件路径（默认 spirograph.<fmt>）
  --help             显示帮助
`;

/** 解析 CLI 参数（返回 null 表示应显示帮助/退出） */
export function parseArgs(argv: string[]): CliOptions | null {
  if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) return null;
  const opts: Partial<CliOptions> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const val = (): string | undefined => argv[++i];
    if (a === '--params') opts.params = val();
    else if (a === '--json') opts.json = val();
    else if (a === '--format') {
      const f = val();
      if (f !== 'png' && f !== 'svg') throw new Error('--format 必须是 png 或 svg');
      opts.format = f;
    } else if (a === '--size') {
      const n = Number(val());
      if (!Number.isFinite(n)) throw new Error('--size 必须是数字');
      opts.size = Math.min(4096, Math.max(64, Math.round(n)));
    }
    // --out 由 main 处理
  }
  if (!opts.params && !opts.json) throw new Error('需要 --params 或 --json 参数');
  if (!opts.format) opts.format = 'png';
  return opts as CliOptions;
}

/** 生成内容（纯逻辑，便于测试；不碰 fs） */
export function generate(opts: CliOptions): CliResult {
  let search = opts.json ? `?${jsonToQuery(opts.json)}` : (opts.params?.startsWith('?') ? opts.params : `?${opts.params ?? ''}`);
  // PNG 尺寸经 query 的 size 参数传给 core（与图片端点一致）；SVG 由 buildSvg 的 sizePx 决定
  if (opts.format === 'png' && opts.size) {
    search += (search.includes('?') && search.length > 1 ? '&' : '') + 'size=' + opts.size;
  }
  const filename = `spirograph.${opts.format}`;
  if (opts.format === 'svg') {
    return { format: 'svg', data: generateSvg(search), filename };
  }
  return { format: 'png', data: generatePng(search), filename };
}

/** 简单把 AppState JSON 转成 query（CLI 场景够用；或直接用 core 的 parseState 无法反序列化整状态） */
function jsonToQuery(json: string): string {
  const s = JSON.parse(json);
  const parts: string[] = [];
  if (s.mode) parts.push('mode=' + s.mode);
  if (s.ringTeeth) parts.push('ring=' + s.ringTeeth);
  if (s.rollingTeeth) parts.push('rolling=' + s.rollingTeeth);
  if (Array.isArray(s.pens)) {
    for (const p of s.pens) {
      const pen = [p.hole, (p.color || '').replace('#', '').toLowerCase(), p.width].join(',');
      if (p.gradient && p.gradient.length > 1) {
        const extra = [p.gradientSpacing ?? 20, ...p.gradient.slice(0, 3).map((c: string) => c.replace('#', '').toLowerCase())].join(',');
        parts.push('pen=' + pen + ',' + extra);
      } else {
        parts.push('pen=' + pen);
      }
    }
  }
  if (s.background) parts.push('bg=' + String(s.background).replace('#', '').toLowerCase());
  if (s.speed) parts.push('speed=' + s.speed);
  if (s.scaleMode) parts.push('scale=' + s.scaleMode);
  if (s.showGears !== undefined) parts.push('gears=' + (s.showGears ? '1' : '0'));
  return parts.join('&');
}

/** CLI 入口（写文件） */
export function main(argv: string[], writeFile: (path: string, data: Uint8Array | string) => void, out = console.log): number {
  if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
    out(HELP);
    return 0;
  }
  try {
    const opts = parseArgs(argv);
    if (!opts) {
      out(HELP);
      return 0;
    }
    const result = generate(opts);
    const outIdx = argv.indexOf('--out');
    const outPath = outIdx !== -1 ? argv[outIdx + 1] : result.filename;
    writeFile(outPath, result.data);
    out(`✓ 已生成 ${result.format.toUpperCase()} → ${outPath}（${typeof result.data === 'string' ? result.data.length + ' 字符' : result.data.length + ' 字节'}）`);
    return 0;
  } catch (err) {
    out('✗ ' + (err instanceof Error ? err.message : String(err)));
    out('');
    out(HELP);
    return 1;
  }
}

/** bin 入口：直接运行（node dist/cli.js 或 npm 链接的 spirograph 命令） */
function isMain(): boolean {
  if (typeof process === 'undefined' || !process.argv?.[1]) return false;
  try {
    return import.meta.url === new URL(`file://${process.argv[1]}`).href ||
      import.meta.url.endsWith(process.argv[1].split('/').pop() ?? '');
  } catch {
    return false;
  }
}

if (isMain()) {
  const code = main(process.argv.slice(2), (path, data) => {
    writeFileSync(path, data);
  });
  process.exitCode = code;
}
