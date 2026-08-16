// 直接读取实际渲染用的 transform
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

console.log('默认渲染:', JSON.stringify(await page.evaluate(() => window.__dshRender)));
await page.evaluate(() => {
  document.querySelector('#scale-seg button[data-scale="fixed"]').click();
});
await page.waitForTimeout(400);
console.log('点击 fixed 后:', JSON.stringify(await page.evaluate(() => window.__dshRender)));
await page.evaluate(() => {
  const s = document.querySelectorAll('.pen-card')[0].querySelector('.pen-hole');
  s.value = '39'; s.dispatchEvent(new Event('input'));
});
await page.waitForTimeout(300);
console.log('设置笔一 39 后:', JSON.stringify(await page.evaluate(() => ({
  render: window.__dshRender,
  state: { scaleMode: window.__dshStore.getState().scaleMode, pens: window.__dshStore.getState().pens.map(p => p.hole) },
}))));
await browser.close();
