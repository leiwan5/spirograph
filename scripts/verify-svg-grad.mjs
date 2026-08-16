import { chromium } from 'playwright-core';
const EDGE = '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
const browser = await chromium.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage();
await page.goto('http://localhost:5273/?ring=72&rolling=30&pen=40,e63946,2.5,30,50,1d6fa5,f4a261', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.evaluate(() => {
  document.getElementById('img-size').value = '512';
});
const [svgDl] = await Promise.all([
  page.waitForEvent('download', { timeout: 10000 }),
  page.click('#export-svg'),
]);
const fs = await import('node:fs');
const svgText = fs.readFileSync(await svgDl.path(), 'utf8');
// 提取所有 stroke 值
const strokes = [...svgText.matchAll(/stroke="([^"]*)"/g)].map((m) => m[1]);
const unique = [...new Set(strokes)];
console.log('path 总数:', (svgText.match(/<path /g) || []).length, '| stroke 值总数:', strokes.length, '| 去重后:', unique.length);
console.log('颜色样例(前 12 个):', strokes.slice(0, 12));
console.log('去重颜色(前 8 个):', unique.slice(0, 8));
await browser.close();
