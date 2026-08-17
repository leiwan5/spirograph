// End-to-end validation of the Show Gears feature
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

// 1) check Show Gears -> gray gear pixels appear in the static image
const before = await page.evaluate(() => {
  const c = document.getElementById('canvas');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let gray = 0;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    if (Math.abs(r - g) < 12 && Math.abs(g - b) < 12 && r > 60 && r < 200 && g < 160) gray++;
  }
  return gray;
});
await page.evaluate(() => {
  document.getElementById('show-gears').click();
});
await page.waitForTimeout(500);
const after = await page.evaluate(() => {
  const c = document.getElementById('canvas');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let gray = 0;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    if (Math.abs(r - g) < 12 && Math.abs(g - b) < 12 && r > 60 && r < 200 && g < 160) gray++;
  }
  return gray;
});
console.log('1) gray gear pixels after checking:', before, '->', after, after - before > 3000 ? 'OK gears shown' : 'WARN gears not clear');

// 2) play animation -> gears move (frame-to-frame difference)
await page.evaluate(() => {
  document.getElementById('speed').value = '2';
  document.getElementById('speed').dispatchEvent(new Event('input'));
});
await page.click('#play');
await page.waitForTimeout(400);
const frame1 = await page.evaluate(() => {
  const c = document.getElementById('canvas');
  return Array.from(c.getContext('2d').getImageData(0, 0, c.width, c.height).data);
});
await page.waitForTimeout(400);
const frame2 = await page.evaluate(() => {
  const c = document.getElementById('canvas');
  return Array.from(c.getContext('2d').getImageData(0, 0, c.width, c.height).data);
});
await page.click('#play'); // pause
let diff = 0;
for (let i = 0; i < frame1.length; i += 4) {
  if (frame1[i] !== frame2[i] || frame1[i + 1] !== frame2[i + 1] || frame1[i + 2] !== frame2[i + 2]) diff++;
}
console.log('2) differing pixels between two animation frames:', diff, diff > 1000 ? 'OK gears+curve moving' : 'WARN no change');

// 3) multi-pen staging: mid-animation (before pen 1 completes), pen 2's blue pixels should be 0
// default is 2 pens. use the 4-pen Spiderweb preset, switch to fixed, play to ~0.15 total progress (still in pen 1's segment)
await page.goto('http://localhost:5273/?ring=144&rolling=60&pen=40,3a86ff,1.8&pen=70,00bbf9,1.5&pen=90,d9a404,1.5&gears=1', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
// inspect state
const st = await page.evaluate(() => {
  const s = window.__dshStore.getState();
  return { showGears: s.showGears, pens: s.pens.length };
});
console.log('3a) URL gears=1 load:', JSON.stringify(st), st.showGears === true ? 'OK' : 'FAIL');

// play at speed 0.3 (slow), pause before pen 1 completes (~within 2.5s)
await page.evaluate(() => {
  document.getElementById('speed').value = '0.3';
  document.getElementById('speed').dispatchEvent(new Event('input'));
});
await page.click('#play');
await page.waitForTimeout(2500); // total duration 15s/0.3 = 50s, first segment 12.5s, now ~5% still in pen 1
const midFrame = await page.evaluate(() => {
  const c = document.getElementById('canvas');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  // pen 2 color 00bbf9 (0,187,249): check for any "solid-line" pixels
  let pen2Pixels = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 2] > 200 && d[i + 1] > 150 && d[i] < 60) pen2Pixels++;
  }
  return pen2Pixels;
});
await page.click('#play'); // pause
console.log('3b) staging: pen2 solid-line pixels mid pen1 draw:', midFrame, midFrame < 50 ? 'OK staging works (pen2 not started)' : 'WARN pen2 appears early');

// 4) play to completion: all 3 pens done
await page.evaluate(() => {
  document.getElementById('speed').value = '10';
  document.getElementById('speed').dispatchEvent(new Event('input'));
});
await page.click('#play');
await page.waitForTimeout(6000);
const done = await page.evaluate(() => {
  const c = document.getElementById('canvas');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let pen2 = 0, pen3 = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 2] > 200 && d[i + 1] > 150 && d[i] < 60) pen2++;
    if (d[i] > 180 && d[i + 1] > 140 && d[i + 1] < 180 && d[i + 2] < 60) pen3++; // d9a404 gold
  }
  return { pen2, pen3 };
});
console.log('4) play complete: pen2 pixels', done.pen2, '| pen3 pixels', done.pen3, done.pen2 > 500 && done.pen3 > 500 ? 'OK all complete' : 'WARN');
console.log('JS errors:', errors.length ? errors : 'none');
await browser.close();
