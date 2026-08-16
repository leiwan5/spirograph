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
console.log('缩放模式选项:', JSON.stringify(labels));

// 切到环固定：检查渲染 scale 变化
await page.evaluate(() => document.querySelector('#scale-seg button[data-scale="fixed"]').click());
await page.waitForTimeout(300);
console.log('环固定 →', JSON.stringify(await page.evaluate(() => ({
  mode: window.__dshStore.getState().scaleMode,
  scale: window.__dshRender.transform.scale,
}))));

// 切回固定图像大小
await page.evaluate(() => document.querySelector('#scale-seg button[data-scale="auto"]').click());
await page.waitForTimeout(300);
console.log('固定图像 →', JSON.stringify(await page.evaluate(() => ({
  mode: window.__dshStore.getState().scaleMode,
  scale: window.__dshRender.transform.scale,
}))));
console.log('JS错误:', errors.length ? errors : '无');
await browser.close();
