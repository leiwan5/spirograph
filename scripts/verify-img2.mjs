// 诊断：PNG CRC 校验 + data URI 解码 + 直接访问 + 同源页面 img
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
const EDGE = '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
const browser = await chromium.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage();

// 1) CRC 校验（Node 侧解析 /tmp/a.png 的每个 chunk）
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
    if (stored !== calc) { ok = false; console.log('CRC 不匹配:', type, stored, calc); }
    if (type === 'IEND') break;
    off += 12 + len;
  }
  return ok;
})();
console.log('1) PNG chunk CRC:', crcOk ? '✅ 全部正确' : '❌ 有错误');

// 2) data URI 解码（绕过网络，验证浏览器能否解码字节）
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
console.log('2) data URI 解码:', dataUri.ok ? '✅ 浏览器可解码 (' + dataUri.w + 'px)' : '❌ 解码失败');

// 3) 直接访问（page.goto 图片 URL → 浏览器显示图片）
const resp = await page.goto('http://localhost:5273/api/image?ring=72&rolling=30&format=png&size=256');
console.log('3) 直接访问:', resp.ok() ? '✅ HTTP ' + resp.status() + ' | ' + resp.headers()['content-type'] : '❌');

// 4) 同源页面内 img 加载
await page.goto('http://localhost:5273/', { waitUntil: 'networkidle' });
const sameOrigin = await page.evaluate(async () => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ ok: true, w: img.naturalWidth });
    img.onerror = () => resolve({ ok: false });
    img.src = '/api/image?ring=72&rolling=30&format=png&size=256';
  });
});
console.log('4) 同源页面 img:', sameOrigin.ok ? '✅ 加载成功 (' + sameOrigin.w + 'px)' : '❌ 失败');

// 5) 外部页面（data: URL HTML）img 引用
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
console.log('5) data: 页面 img 跨源引用:', extResult.ok ? '✅ (' + extResult.w + 'px)' : '❌ 失败');
await browser.close();
