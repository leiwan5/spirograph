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

// 1) check gradient -> extra color slots appear + canvas shows multiple colors
await page.evaluate(() => {
  const cb = document.querySelectorAll('.pen-card')[0].querySelector('.pen-grad');
  cb.click();
});
await page.waitForTimeout(500);
const slots = await page.evaluate(() => document.querySelectorAll('.pen-card')[0].querySelectorAll('.pen-grad-color').length);
const state1 = await page.evaluate(() => window.__dshStore.getState().pens[0].gradient);
console.log('1) check gradient: color slots', slots, '| state', JSON.stringify(state1), slots === 1 && state1.length === 1 ? 'OK' : 'WARN');

// 2) canvas gradient: pen 1 curve has both the start color and the extra color (two+ reds/other colors)
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
console.log('2) canvas color variety (rough):', colors, colors > 6 ? 'OK gradient in effect (multi-color)' : 'WARN likely still single color');

// 3) add a 2nd gradient color + start/length sliders
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
console.log('3) 2 colors + start 50 + length 30:', JSON.stringify(state3), state3.gradient.length === 2 && state3.start === 50 && state3.length === 30 ? 'OK' : 'WARN');

// 4) load new URL format
await page.goto('http://localhost:5273/?ring=72&rolling=30&pen=40,e63946,2.5,30,50,1d6fa5,f4a261', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
const state4 = await page.evaluate(() => {
  const p = window.__dshStore.getState().pens[0];
  return { gradient: p.gradient, start: p.gradientStart, length: p.gradientLength };
});
console.log('4) new URL format (30,50,2 colors):', JSON.stringify(state4), state4.gradient.length === 2 && state4.start === 30 && state4.length === 50 ? 'OK' : 'WARN');

// 5) export SVG gradient (multi-segment path with different strokes)
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
console.log('5) SVG path segments:', strokeCount, '| distinct stroke colors:', colorsInSvg.length, strokeCount > 5 && colorsInSvg.length > 2 ? 'OK gradient export' : 'WARN');

// 6) /api/image PNG gradient (both red and blue pixels exist)
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
console.log('6) PNG gradient: red pixels', pngCheck.red, '| blue pixels', pngCheck.blue, pngCheck.red > 500 && pngCheck.blue > 500 ? 'OK' : 'WARN');
console.log('JS errors:', errors.length ? errors : 'none');
await browser.close();
