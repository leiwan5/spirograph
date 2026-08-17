#!/usr/bin/env node
/**
 * Purity guard: ensures @spirograph/core's pure logic does not reference platform-specific globals/APIs.
 * Rule: under packages/core/src, except browser.ts (the browser adaptation entry),
 * none of window/document/process/require/Buffer/URLSearchParams/TextEncoder/TextDecoder
 * /setTimeout/setInterval/requestAnimationFrame/performance/location/history/navigator/fetch may appear.
 * Exit code 0 = pass; 1 = violation (lists file:line).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const CORE = join(ROOT, 'packages/core/src');
const EXCLUDED = new Set(['browser.ts']);

const FORBIDDEN = [
  'window', 'document', 'process', 'require', 'Buffer',
  'URLSearchParams', 'TextEncoder', 'TextDecoder',
  'setTimeout', 'setInterval', 'requestAnimationFrame', 'cancelAnimationFrame',
  'performance', 'location', 'history', 'navigator', 'fetch', 'XMLHttpRequest',
  'document.createElement', 'Blob', 'URL.createObjectURL',
];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (name.endsWith('.ts') && !name.endsWith('.test.ts') && !EXCLUDED.has(name)) out.push(p);
  }
  return out;
}

let bad = 0;
for (const file of walk(CORE)) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, idx) => {
    for (const token of FORBIDDEN) {
      // Exclude comments: full-line // text and inline text after //
      const code = line.replace(/\/\/.*$/, '');
      if (code.includes(token)) {
        console.error(`✗ ${file.replace(ROOT, '')}:${idx + 1} contains platform-specific "${token}"`);
        bad++;
      }
    }
  });
}

if (bad > 0) {
  console.error(`\n${bad} core purity violation(s) (excluding browser.ts).`);
  process.exit(1);
}
console.log('✓ @spirograph/core pure logic has zero platform dependencies (window/document/process/URLSearchParams/TextEncoder etc. not used)');
