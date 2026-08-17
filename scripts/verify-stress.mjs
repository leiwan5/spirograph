// High-pressure operation sequence: preset/random/gears/play/change-params in random order over 40 rounds, monitoring for crashes
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

await page.goto('http://localhost:5273/', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);

const ops = [
  () => page.evaluate(() => document.getElementById('show-gears').click()),
  () => page.evaluate(() => [...document.querySelectorAll('#preset-chips .chip')][Math.floor(Math.random() * 7)].click()),
  () => page.click('#random'),
  () => page.click('#play'),
  () => page.evaluate(() => {
    const s = document.querySelectorAll('.pen-card')[0].querySelector('.pen-hole');
    s.value = String(20 + Math.floor(Math.random() * 80));
    s.dispatchEvent(new Event('input'));
  }),
  () => page.evaluate(() => document.querySelector('#scale-seg button[data-scale="fixed"]').click()),
  () => page.evaluate(() => document.querySelector('#mode-seg button[data-mode="outside"]').click()),
  () => page.evaluate(() => document.querySelector('#mode-seg button[data-mode="inside"]').click()),
  () => page.click('#add-pen'),
];

for (let i = 0; i < 40; i++) {
  const op = ops[Math.floor(Math.random() * ops.length)];
  try { await op(); } catch (e) { /* element may not exist */ }
  await page.waitForTimeout(80 + Math.random() * 150);
}
await page.waitForTimeout(1000);
console.log('pageerror after 40 rounds of random operations:', errors.length ? errors : 'none');
console.log('canvas non-background pixels:', await page.evaluate(() => {
  const c = document.getElementById('canvas');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let n = 0;
  for (let i = 0; i < d.length; i += 4) if (!(d[i] === 255 && d[i + 1] === 255 && d[i + 2] === 255)) n++;
  return n;
}));
// check pens state
console.log('pens:', await page.evaluate(() => window.__dshStore.getState().pens.length));
await browser.close();
