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

// 1) URL 循环渐变加载：2 色、起点 20、长度 30、循环
await page.goto('http://localhost:5273/?ring=72&rolling=30&pen=40,e63946,2.5,20,30,1,1d6fa5', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
const state = await page.evaluate(() => {
  const p = window.__dshStore.getState().pens[0];
  return { gradient: p.gradient, start: p.gradientStart, length: p.gradientLength, loop: p.gradientLoop };
});
console.log('1) URL 循环渐变:', JSON.stringify(state), state.loop === true && state.start === 20 && state.length === 30 ? '✅' : '⚠');

// 2) 画布颜色：循环渐变应出现多次红→蓝过渡（颜色分布两端）
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
console.log('2) 循环渐变颜色: 红', colors.red, '| 蓝', colors.blue, '| 紫(过渡)', colors.purple,
  colors.red > 300 && colors.blue > 300 && colors.purple > 200 ? '✅ 多周期循环（红→蓝→红→蓝...）' : '⚠');

// 3) UI 勾选循环
await page.evaluate(() => {
  const card = document.querySelectorAll('.pen-card')[0];
  const cb = card.querySelector('.pen-grad-loop');
  cb.click();
});
await page.waitForTimeout(300);
const loopState = await page.evaluate(() => window.__dshStore.getState().pens[0].gradientLoop);
console.log('3) UI 切换循环:', loopState === false ? '✅ 可关闭' : '⚠');

// 4) SVG 导出：循环渐变（颜色序列含多次首色）
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
console.log('4) SVG 循环渐变: 首色出现次数', redRuns, '（循环应多次回到首色）', redRuns > 3 ? '✅' : '⚠');
console.log('JS错误:', errors.length ? errors : '无');
await browser.close();
