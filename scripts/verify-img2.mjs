// Diagnostics: PNG CRC check + data URI decode + direct access + same-origin page img
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
const EDGE = '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
const browser = await chromium.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage();

// 1) CRC check (parse each chunk of /tmp/a.png on the Node side)
const crcOk = await (async () => {
  const buf = readFileSync('/tmp/a.png');
  const table = new Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  const crc32 = (b) => {
    let crc = 0xffffffff;
    for (let i = 0; i < b.length; i++) crc = (crc >>> 8) ^ table[(crc ^ b[i]) & 0xff];
    return (crc ^ 0xffffffff) >>> 0;
  };
  let off = 8, ok = true;
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    const stored = buf.readUInt32BE(off + 8 + len);
    const calc = crc32(Buffer.concat([Buffer.from(type), data]));
    if (stored !== calc) { ok = false; console.log('CRC mismatch:', type, stored, calc); }
    if (type === 'IEND') break;
    off += 12 + len;
  }
  return ok;
})();
console.log('1) PNG chunk CRC:', crcOk ? '✅ all correct' : '❌ errors found');

// 2) data URI decode (bypass the network, verify the browser can decode the bytes)
const dataUri = await page.evaluate(async () => {
  const resp = await fetch('http://localhost:5273/api/image?ring=72&rolling=30&format=png&size=256');
  const blob = await resp.blob();
  const dataUrl = await new Promise((res) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.readAsDataURL(blob);
  });
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ ok: true, w: img.naturalWidth });
    img.onerror = () => resolve({ ok: false });
    img.src = dataUrl;
  });
});
console.log('2) data URI decode:', dataUri.ok ? '✅ browser can decode (' + dataUri.w + 'px)' : '❌ decode failed');

// 3) direct access (page.goto the image URL -> browser displays the image)
const resp = await page.goto('http://localhost:5273/api/image?ring=72&rolling=30&format=png&size=256');
console.log('3) direct access:', resp.ok() ? '✅ HTTP ' + resp.status() + ' | ' + resp.headers()['content-type'] : '❌');

// 4) img load inside a same-origin page
await page.goto('http://localhost:5273/', { waitUntil: 'networkidle' });
const sameOrigin = await page.evaluate(async () => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ ok: true, w: img.naturalWidth });
    img.onerror = () => resolve({ ok: false });
    img.src = '/api/image?ring=72&rolling=30&format=png&size=256';
  });
});
console.log('4) same-origin page img:', sameOrigin.ok ? '✅ loaded (' + sameOrigin.w + 'px)' : '❌ failed');

// 5) external page (data: URL HTML) img reference
const ext = await browser.newPage();
await ext.goto('data:text/html,<html><body><img id="i"></body></html>');
const extResult = await ext.evaluate(async () => {
  return new Promise((resolve) => {
    const img = document.getElementById('i');
    img.onload = () => resolve({ ok: true, w: img.naturalWidth });
    img.onerror = () => resolve({ ok: false });
    img.src = 'http://localhost:5273/api/image?ring=72&rolling=30&format=png&size=256';
  });
});
console.log('5) data: page img cross-origin reference:', extResult.ok ? '✅ (' + extResult.w + 'px)' : '❌ failed');
await browser.close();
