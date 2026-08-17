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
    if (r > 240 && g > 240 && b > 240) continue; // background
    total++;
    if (r > 200 && g < 130 && b < 130) red++;
    else if (b > 200 && r < 100) blue++;
    else if (r > 90 && b > 90 && Math.abs(r - b) < 90) purple++;
  }
  return { red, blue, purple, total };
});
console.log('loop gradient (2 colors, start 20, length 30):');
console.log('  red-segment pixels:', colors.red, '| blue-segment pixels:', colors.blue, '| transition purple:', colors.purple, '| non-background total:', colors.total);
const ok = colors.red > 50 && colors.blue > 50 && colors.purple > 100 && colors.total > 500;
console.log(ok ? '✅ loop gradient (red→blue multi-cycle)' : '⚠ ' + JSON.stringify(colors));

// comparison: non-loop (start 20 length 30 -> second half stays pure blue)
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
console.log('non-loop (start 20 length 30): blue pixels', colors2.blue, '/', colors2.total, colors2.blue > 100 ? '✅ second half stays pure blue' : '⚠');
await browser.close();
