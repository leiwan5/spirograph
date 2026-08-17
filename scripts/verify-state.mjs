// Verify: whether the store's scaleMode actually changes after clicking the fixed button
import { chromium } from 'playwright-core';

const EDGE = '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
const browser = await chromium.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto('http://localhost:5273/', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);

const before = await page.evaluate(async () => {
  const store = await import('/src/state/store.ts');
  const btn = document.querySelector('#scale-seg button[data-scale="fixed"]');
  return {
    scaleMode: store.getState().scaleMode,
    btnText: btn.textContent,
    btnActive: btn.classList.contains('active'),
  };
});
console.log('before click:', JSON.stringify(before));

await page.evaluate(() => {
  document.querySelector('#scale-seg button[data-scale="fixed"]').click();
});
await page.waitForTimeout(400);

const after = await page.evaluate(async () => {
  const store = await import('/src/state/store.ts');
  const btn = document.querySelector('#scale-seg button[data-scale="fixed"]');
  return {
    scaleMode: store.getState().scaleMode,
    btnActive: btn.classList.contains('active'),
    autoActive: document.querySelector('#scale-seg button[data-scale="auto"]').classList.contains('active'),
  };
});
console.log('after click:', JSON.stringify(after));

// after setting the hole again, check whether scaleMode is reset
await page.evaluate(() => {
  const s = document.querySelectorAll('.pen-card')[0].querySelector('.pen-hole');
  s.value = '39';
  s.dispatchEvent(new Event('input'));
});
await page.waitForTimeout(300);
const afterHole = await page.evaluate(async () => {
  const store = await import('/src/state/store.ts');
  return { scaleMode: store.getState().scaleMode, hole0: store.getState().pens[0].hole };
});
console.log('after setting hole:', JSON.stringify(afterHole));
await browser.close();
