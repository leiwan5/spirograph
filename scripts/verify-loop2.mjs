import { chromium } from 'playwright-core';
const EDGE = '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
const browser = await chromium.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto('http://localhost:5273/?ring=72&rolling=30&pen=40,e63946,2.5,20,30,1,1d6fa5', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);

const colors = await page.evaluate(() => {
  const c = document.getElementById('canvas');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let red = 0, blue = 0, purple = 0, total = 0;
  for (let i = 0; i < d.length; i += 16) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    if (r > 240 && g > 240 && b > 240) continue; // 背景
    total++;
    if (r > 200 && g < 130 && b < 130) red++;
    else if (b > 200 && r < 100) blue++;
    else if (r > 90 && b > 90 && Math.abs(r - b) < 90) purple++;
  }
  return { red, blue, purple, total };
});
console.log('循环渐变(2色,起点20,长度30):');
console.log('  红色段像素:', colors.red, '| 蓝色段像素:', colors.blue, '| 过渡紫:', colors.purple, '| 非背景总数:', colors.total);
const ok = colors.red > 50 && colors.blue > 50 && colors.purple > 100 && colors.total > 500;
console.log(ok ? '✅ 循环渐变（红→蓝 多周期）' : '⚠ ' + JSON.stringify(colors));

// 对比：不循环时（起点20长度30 → 后段 50% 纯蓝）
await page.goto('http://localhost:5273/?ring=72&rolling=30&pen=40,e63946,2.5,20,30,1d6fa5', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
const colors2 = await page.evaluate(() => {
  const c = document.getElementById('canvas');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let blue = 0, total = 0;
  for (let i = 0; i < d.length; i += 16) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    if (r > 240 && g > 240 && b > 240) continue;
    total++;
    if (b > 200 && r < 100) blue++;
  }
  return { blue, total };
});
console.log('不循环(起点20长度30): 蓝像素', colors2.blue, '/', colors2.total, colors2.blue > 100 ? '✅ 后段保持纯蓝' : '⚠');
await browser.close();
