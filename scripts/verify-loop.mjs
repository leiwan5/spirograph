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

// 1) URL loop-gradient load: 2 colors, start 20, length 30, loop
await page.goto('http://localhost:5273/?ring=72&rolling=30&pen=40,e63946,2.5,20,30,1,1d6fa5', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
const state = await page.evaluate(() => {
  const p = window.__dshStore.getState().pens[0];
  return { gradient: p.gradient, start: p.gradientStart, length: p.gradientLength, loop: p.gradientLoop };
});
console.log('1) URL loop gradient:', JSON.stringify(state), state.loop === true && state.start === 20 && state.length === 30 ? '✅' : '⚠');

// 2) canvas colors: a loop gradient should show repeated red-to-blue transitions (color at both ends)
const colors = await page.evaluate(() => {
  const c = document.getElementById('canvas');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let red = 0, blue = 0, purple = 0;
  for (let i = 0; i < d.length; i += 8) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    if (r > 200 && b < 60) red++;
    else if (b > 200 && r < 60) blue++;
    else if (r > 100 && b > 100 && Math.abs(r - b) < 80) purple++;
  }
  return { red, blue, purple };
});
console.log('2) loop gradient colors: red', colors.red, '| blue', colors.blue, '| purple(transition)', colors.purple,
  colors.red > 300 && colors.blue > 300 && colors.purple > 200 ? '✅ multi-cycle loop (red→blue→red→blue...)' : '⚠');

// 3) UI checkbox for loop
await page.evaluate(() => {
  const card = document.querySelectorAll('.pen-card')[0];
  const cb = card.querySelector('.pen-grad-loop');
  cb.click();
});
await page.waitForTimeout(300);
const loopState = await page.evaluate(() => window.__dshStore.getState().pens[0].gradientLoop);
console.log('3) UI toggle loop:', loopState === false ? '✅ can be turned off' : '⚠');

// 4) SVG export: loop gradient (color sequence contains the first color multiple times)
await page.goto('http://localhost:5273/?ring=72&rolling=30&pen=40,e63946,2.5,10,20,1,1d6fa5', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.evaluate(() => { document.getElementById('img-size').value = '512'; });
const [svgDl] = await Promise.all([
  page.waitForEvent('download', { timeout: 10000 }),
  page.click('#export-svg'),
]);
const fs = await import('node:fs');
const svgText = fs.readFileSync(await svgDl.path(), 'utf8');
const strokes = [...svgText.matchAll(/stroke="([^"]*)"/g)].map((m) => m[1]);
const redRuns = strokes.filter((s) => s === '#e63946' || s === 'rgb(255,0,0)').length;
console.log('4) SVG loop gradient: first-color occurrence count', redRuns, '(loop should return to the first color multiple times)', redRuns > 3 ? '✅' : '⚠');
console.log('JS errors:', errors.length ? errors : 'none');
await browser.close();
