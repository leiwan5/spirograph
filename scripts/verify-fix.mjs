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
console.log('初始 mode:', await page.evaluate(() => window.__dshStore.getState().mode));

// 1) 点击 fixed → mode 必须保留 inside
await page.evaluate(() => {
  document.querySelector('#scale-seg button[data-scale="fixed"]').click();
});
await page.waitForTimeout(300);
console.log('点击fixed后 mode:', await page.evaluate(() => window.__dshStore.getState().mode),
  '| scaleMode:', await page.evaluate(() => window.__dshStore.getState().scaleMode));

// 2) 点击 outside → mode 切换正常
await page.evaluate(() => {
  document.querySelector('#mode-seg button[data-mode="outside"]').click();
});
await page.waitForTimeout(300);
console.log('点击outside后 mode:', await page.evaluate(() => window.__dshStore.getState().mode),
  '| 渲染scaleMode:', await page.evaluate(() => window.__dshRender.scaleMode),
  '| 渲染scale:', await page.evaluate(() => window.__dshRender.transform.scale));

// 3) 回到 inside + fixed：期望 scale = (864-69.12)/(2*72) = 5.52，bounds = ±72
await page.evaluate(() => {
  document.querySelector('#mode-seg button[data-mode="inside"]').click();
});
await page.waitForTimeout(300);
console.log('inside+fixed 渲染:', JSON.stringify(await page.evaluate(() => window.__dshRender)));

// 4) 外切 + fixed：期望 bounds ±132 → scale 3.01
await page.evaluate(() => {
  document.querySelector('#mode-seg button[data-mode="outside"]').click();
});
await page.waitForTimeout(300);
console.log('outside+fixed 渲染:', JSON.stringify(await page.evaluate(() => window.__dshRender)));
await browser.close();
