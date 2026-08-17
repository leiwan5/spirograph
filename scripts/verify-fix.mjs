import { chromium } from 'playwright-core';
const EDGE = '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
const browser = await chromium.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto('http://localhost:5273/', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
console.log('initial mode:', await page.evaluate(() => window.__dshStore.getState().mode));

// 1) click fixed -> mode must remain inside
await page.evaluate(() => {
  document.querySelector('#scale-seg button[data-scale="fixed"]').click();
});
await page.waitForTimeout(300);
console.log('mode after clicking fixed:', await page.evaluate(() => window.__dshStore.getState().mode),
  '| scaleMode:', await page.evaluate(() => window.__dshStore.getState().scaleMode));

// 2) click outside -> mode switches normally
await page.evaluate(() => {
  document.querySelector('#mode-seg button[data-mode="outside"]').click();
});
await page.waitForTimeout(300);
console.log('mode after clicking outside:', await page.evaluate(() => window.__dshStore.getState().mode),
  '| rendered scaleMode:', await page.evaluate(() => window.__dshRender.scaleMode),
  '| rendered scale:', await page.evaluate(() => window.__dshRender.transform.scale));

// 3) back to inside + fixed: expected scale = (864-69.12)/(2*72) = 5.52, bounds = ±72
await page.evaluate(() => {
  document.querySelector('#mode-seg button[data-mode="inside"]').click();
});
await page.waitForTimeout(300);
console.log('inside+fixed render:', JSON.stringify(await page.evaluate(() => window.__dshRender)));

// 4) outside + fixed: expected bounds ±132 -> scale 3.01
await page.evaluate(() => {
  document.querySelector('#mode-seg button[data-mode="outside"]').click();
});
await page.waitForTimeout(300);
console.log('outside+fixed render:', JSON.stringify(await page.evaluate(() => window.__dshRender)));
await browser.close();
