#!/usr/bin/env node
/**
 * 纯度守卫：检查 @spirograph/core 纯逻辑部分不出现平台专属全局/API。
 * 规则：packages/core/src 下除 browser.ts（浏览器适配入口）外，
 * 禁止出现 window/document/process/require/Buffer/URLSearchParams/TextEncoder/TextDecoder
 * /setTimeout/setInterval/requestAnimationFrame/performance/location/history/navigator/fetch。
 * 退出码 0 = 通过；1 = 违规（列出文件:行）。
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
      // 排除注释：整行 // 或行内 // 之后的文字
      const code = line.replace(/\/\/.*$/, '');
      if (code.includes(token)) {
        console.error(`✗ ${file.replace(ROOT, '')}:${idx + 1} 含平台专属 "${token}"`);
        bad++;
      }
    }
  });
}

if (bad > 0) {
  console.error(`\n核心纯度违规 ${bad} 处（browser.ts 除外）。`);
  process.exit(1);
}
console.log('✓ @spirograph/core 纯逻辑部分零平台依赖（window/document/process/URLSearchParams/TextEncoder 等均未使用）');
