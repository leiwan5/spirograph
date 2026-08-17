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
await page.waitForTimeout(800);

const labels = await page.evaluate(() => {
  const b = document.querySelectorAll('#scale-seg button');
  return Array.from(b).map((x) => x.textContent);
});
console.log('scale mode options:', JSON.stringify(labels));

// switch to ring-fixed: check the render scale changes
await page.evaluate(() => document.querySelector('#scale-seg button[data-scale="fixed"]').click());
await page.waitForTimeout(300);
console.log('ring-fixed →', JSON.stringify(await page.evaluate(() => ({
  mode: window.__dshStore.getState().scaleMode,
  scale: window.__dshRender.transform.scale,
}))));

// switch back to fixed image size
await page.evaluate(() => document.querySelector('#scale-seg button[data-scale="auto"]').click());
await page.waitForTimeout(300);
console.log('fixed image →', JSON.stringify(await page.evaluate(() => ({
  mode: window.__dshStore.getState().scaleMode,
  scale: window.__dshRender.transform.scale,
}))));
console.log('JS errors:', errors.length ? errors : 'none');
await browser.close();
