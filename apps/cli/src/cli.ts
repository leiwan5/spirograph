#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import { generatePng, generateSvg } from '@spirograph/core';

export interface CliOptions {
  /** query params (same as image endpoints / share links), e.g. ring=72&rolling=30&pen=40,e63946,2.5 */
  params?: string;
  /** provide the AppState JSON directly (overrides params) */
  json?: string;
  format: 'png' | 'svg';
  size?: number;
}

export interface CliResult {
  format: 'png' | 'svg';
  /** the generated file content (png=Uint8Array / svg=string) */
  data: Uint8Array | string;
  /** suggested filename */
  filename: string;
}

const HELP = `spirograph — spirograph pattern generation CLI (based on @spirograph/core)

Usage:
  spirograph generate --params "ring=72&rolling=30&pen=40,e63946,2.5&pen=75,1d6fa5,2" --format png --size 2048 --out out.png
  spirograph generate --params "…" --format svg --out out.svg
  spirograph generate --json '{"mode":"inside","ringTeeth":72,"rollingTeeth":30,"pens":[{"hole":40,"color":"#e63946","width":2.5}]}' --format png
  spirograph --help

Options:
  --params <query>   query params (ring/rolling/mode/pen/bg/scale/speed/gears/size)
  --json <json>      provide an AppState JSON directly (takes precedence over --params)
  --format <fmt>     png | svg (default png)
  --size <n>         png size 64–4096 (default 1000)
  --out <path>       output file path (default spirograph.<fmt>)
  --help             show help
`;

/** Parse CLI args (returns null to indicate help/exit) */
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
      if (f !== 'png' && f !== 'svg') throw new Error('--format must be png or svg');
      opts.format = f;
    } else if (a === '--size') {
      const n = Number(val());
      if (!Number.isFinite(n)) throw new Error('--size must be a number');
      opts.size = Math.min(4096, Math.max(64, Math.round(n)));
    }
    // --out is handled by main
  }
  if (!opts.params && !opts.json) throw new Error('need --params or --json');
  if (!opts.format) opts.format = 'png';
  return opts as CliOptions;
}

/** Generate content (pure logic, easy to test; does not touch fs) */
export function generate(opts: CliOptions): CliResult {
  let search = opts.json ? `?${jsonToQuery(opts.json)}` : (opts.params?.startsWith('?') ? opts.params : `?${opts.params ?? ''}`);
  // png size is passed to core via the query's size param (same as the image endpoint); svg is decided by buildSvg's sizePx
  if (opts.format === 'png' && opts.size) {
    search += (search.includes('?') && search.length > 1 ? '&' : '') + 'size=' + opts.size;
  }
  const filename = `spirograph.${opts.format}`;
  if (opts.format === 'svg') {
    return { format: 'svg', data: generateSvg(search), filename };
  }
  return { format: 'png', data: generatePng(search), filename };
}

/** Simply convert AppState JSON to query (enough for the CLI scenario; input is colors semantics) */
function jsonToQuery(json: string): string {
  const s = JSON.parse(json);
  const parts: string[] = [];
  if (s.mode) parts.push('mode=' + s.mode);
  if (s.ringTeeth) parts.push('ring=' + s.ringTeeth);
  if (s.rollingTeeth) parts.push('rolling=' + s.rollingTeeth);
  if (Array.isArray(s.pens)) {
    for (const p of s.pens) {
      const colors: string[] = Array.isArray(p.colors) ? p.colors : [p.color].filter(Boolean);
      const pen = [p.hole, p.width, ...colors.map((c: string) => c.replace('#', '').toLowerCase())].join(',');
      if (colors.length > 1) {
        // multi-color: hole,width,spacing,c1[,c2...]
        const sp = p.spacing ?? p.gradientSpacing ?? 20;
        parts.push(`pen=${p.hole},${p.width},${sp},${colors.map((c: string) => c.replace('#', '').toLowerCase()).join(',')}`);
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

/** CLI entry (writes a file) */
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
    out(`✓ generated ${result.format.toUpperCase()} → ${outPath} (${typeof result.data === 'string' ? result.data.length + ' chars' : result.data.length + ' bytes'})`);
    return 0;
  } catch (err) {
    out('✗ ' + (err instanceof Error ? err.message : String(err)));
    out('');
    out(HELP);
    return 1;
  }
}

/** bin entry: run directly (node dist/cli.js or the npm-linked spirograph command) */
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
