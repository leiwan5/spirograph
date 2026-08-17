// Reproduce using the user's URL
import { chromium } from 'playwright-core';

const EDGE = '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
const browser = await chromium.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message + ' | ' + (e.stack || '').split('\n').slice(1, 4).join(' | ')));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

const URL = 'http://localhost:5273/?ring=73&rolling=15&mode=inside&pen=57%2C2a9d8f%2C1.8&pen=36%2C1d6fa5%2C2.1&pen=74%2C9b5de5%2C2.7&bg=ffffff&speed=2.9&scale=auto&gears=1';
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

// state confirmation
const st = await page.evaluate(() => {
  const s = window.__dshStore.getState();
  return { ring: s.ringTeeth, rolling: s.rollingTeeth, pens: s.pens.length, gears: s.showGears, scale: s.scaleMode, speed: s.speed };
});
console.log('load state:', JSON.stringify(st));

// play
await page.click('#play');
await page.waitForTimeout(1000);
console.log('pageerror after playing 1s:', errors.length ? errors : 'none');
const frame1 = await page.evaluate(() => {
  const c = document.getElementById('canvas');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let n = 0;
  for (let i = 0; i < d.length; i += 4) if (!(d[i] === 255 && d[i + 1] === 255 && d[i + 2] === 255)) n++;
  return n;
});
console.log('canvas non-background pixels:', frame1);

// pause → play again (the user may interact multiple times)
if (errors.length === 0) {
  await page.click('#play'); // pause
  await page.waitForTimeout(300);
  await page.click('#play'); // play again
  await page.waitForTimeout(1500);
  console.log('pageerror after pause and replay:', errors.length ? errors : 'none');
}
console.log('button state:', await page.textContent('#play'));
await browser.close();
