import { chromium } from 'playwright-core';
const EDGE = '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
const browser = await chromium.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://localhost:5273/?ring=72&rolling=30&pen=40,e63946,2.5', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);

// 1) 勾选渐变 → 附加色槽出现 + 画布出现多色
await page.evaluate(() => {
  const cb = document.querySelectorAll('.pen-card')[0].querySelector('.pen-grad');
  cb.click();
});
await page.waitForTimeout(500);
const slots = await page.evaluate(() => document.querySelectorAll('.pen-card')[0].querySelectorAll('.pen-grad-color').length);
const state1 = await page.evaluate(() => window.__dshStore.getState().pens[0].gradient);
console.log('1) 勾选渐变: 色槽', slots, '| 状态', JSON.stringify(state1), slots === 1 && state1.length === 1 ? '✅' : '⚠');

// 2) 画布渐变：笔一曲线含起始色与附加色（两种以上红色系/其他色）
const colors = await page.evaluate(() => {
  const c = document.getElementById('canvas');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  const set = new Set();
  for (let i = 0; i < d.length; i += 8) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    if (r === 255 && g === 255 && b === 255) continue;
    set.add((r >> 4) + ',' + (g >> 4) + ',' + (b >> 4));
  }
  return set.size;
});
console.log('2) 画布颜色种类(粗略):', colors, colors > 6 ? '✅ 渐变生效（多色）' : '⚠ 可能仍单色');

// 3) 添加第 2 个渐变色 + 起点/长度滑块
await page.evaluate(() => {
  const card = document.querySelectorAll('.pen-card')[0];
  card.querySelector('.pen-grad-add').click();
  const start = card.querySelector('.pen-grad-start');
  start.value = '50'; start.dispatchEvent(new Event('input'));
  const len = card.querySelector('.pen-grad-length');
  len.value = '30'; len.dispatchEvent(new Event('input'));
});
await page.waitForTimeout(400);
const state3 = await page.evaluate(() => {
  const p = window.__dshStore.getState().pens[0];
  return { gradient: p.gradient, start: p.gradientStart, length: p.gradientLength };
});
console.log('3) 2 色 + 起点50 + 长度30:', JSON.stringify(state3), state3.gradient.length === 2 && state3.start === 50 && state3.length === 30 ? '✅' : '⚠');

// 4) URL 新格式加载
await page.goto('http://localhost:5273/?ring=72&rolling=30&pen=40,e63946,2.5,30,50,1d6fa5,f4a261', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
const state4 = await page.evaluate(() => {
  const p = window.__dshStore.getState().pens[0];
  return { gradient: p.gradient, start: p.gradientStart, length: p.gradientLength };
});
console.log('4) URL 新格式(30,50,2色):', JSON.stringify(state4), state4.gradient.length === 2 && state4.start === 30 && state4.length === 50 ? '✅' : '⚠');

// 5) 导出 SVG 渐变（多段 path 不同 stroke）
await page.evaluate(() => {
  document.getElementById('img-size').value = '512';
});
const [svgDl] = await Promise.all([
  page.waitForEvent('download', { timeout: 10000 }),
  page.click('#export-svg'),
]);
const fs = await import('node:fs');
const svgText = fs.readFileSync(await svgDl.path(), 'utf8');
const strokeCount = (svgText.match(/<path /g) || []).length;
const colorsInSvg = [...new Set([...svgText.matchAll(/stroke="#[0-9a-f]{6}"|stroke="rgb([^)]*)"/g)].map((m) => m[0]))];
console.log('5) SVG path 段数:', strokeCount, '| 不同 stroke 色数:', colorsInSvg.length, strokeCount > 5 && colorsInSvg.length > 2 ? '✅ 渐变导出' : '⚠');

// 6) /api/image PNG 渐变（红+蓝像素都存在）
const pngCheck = await page.evaluate(async () => {
  const resp = await fetch('/api/image?ring=72&rolling=30&pen=40,e63946,2.5,30,50,1d6fa5&format=png&size=256');
  const blob = await resp.blob();
  const dataUrl = await new Promise((res) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.readAsDataURL(blob);
  });
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement('canvas');
      cv.width = 256; cv.height = 256;
      const ctx = cv.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, 256, 256).data;
      let red = 0, blue = 0;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i] > 180 && d[i + 2] < 120) red++;
        if (d[i + 2] > 150 && d[i] < 100) blue++;
      }
      resolve({ red, blue });
    };
    img.src = dataUrl;
  });
});
console.log('6) PNG 渐变: 红像素', pngCheck.red, '| 蓝像素', pngCheck.blue, pngCheck.red > 500 && pngCheck.blue > 500 ? '✅' : '⚠');
console.log('JS错误:', errors.length ? errors : '无');
await browser.close();
