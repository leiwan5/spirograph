// 真实跨源验证：5299 端口的页面引用 5273 的图片
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';

// 临时静态服务器（模拟"另一个网站"）
const server = createServer((req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.end(`<!doctype html><html><body>
    <img id="png" src="http://localhost:5273/api/image?ring=72&rolling=30&pen=40,e63946,2.5&format=png&size=256">
    <img id="svg" src="http://localhost:5273/api/image?ring=72&rolling=30&format=svg">
    <img id="root" src="http://localhost:5273/?ring=72&rolling=30&format=png&size=256">
  </body></html>`);
});
await new Promise((r) => server.listen(5299, r));

const EDGE = '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
const browser = await chromium.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://localhost:5299/', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

const r = await page.evaluate(() => {
  const png = document.getElementById('png');
  const svg = document.getElementById('svg');
  const root = document.getElementById('root');
  return {
    png: png.naturalWidth > 0 ? '✅ ' + png.naturalWidth + 'px' : '❌',
    svg: svg.naturalWidth > 0 ? '✅ ' + svg.naturalWidth + 'px' : '❌',
    root: root.naturalWidth > 0 ? '✅ ' + root.naturalWidth + 'px' : '❌',
  };
});
console.log('跨站引用:', JSON.stringify(r, null, 1));
console.log('JS错误:', errors.length ? errors : '无');
server.close();
await browser.close();
