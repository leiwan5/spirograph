// 用 window.__dshStore 验证：点击 fixed 后主实例状态与渲染
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

console.log('初始 scaleMode:', await page.evaluate(() => window.__dshStore.getState().scaleMode));
await page.evaluate(() => {
  document.querySelector('#scale-seg button[data-scale="fixed"]').click();
});
await page.waitForTimeout(400);
console.log('点击后 scaleMode:', await page.evaluate(() => window.__dshStore.getState().scaleMode));

// 设置孔洞 39/79 并抓渲染尺度
await page.evaluate(() => {
  const s = document.querySelectorAll('.pen-card')[0].querySelector('.pen-hole');
  s.value = '39'; s.dispatchEvent(new Event('input'));
});
await page.waitForTimeout(300);
const inkBox = await page.evaluate(() => {
  const c = document.getElementById('canvas');
  const img = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  const W = c.width;
  let minX = W, minY = c.height, maxX = 0, maxY = 0, n = 0;
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (!(img[i] === 255 && img[i + 1] === 255 && img[i + 2] === 255)) {
        n++;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }
  return { box: [minX, minY, maxX, maxY], w: W, h: c.height, ink: n };
});
console.log('当前状态:', JSON.stringify(await page.evaluate(() => {
  const s = window.__dshStore.getState();
  return { scaleMode: s.scaleMode, pens: s.pens.map(p => p.hole), ring: s.ringTeeth, rolling: s.rollingTeeth };
})));
console.log('画布墨迹范围:', JSON.stringify(inkBox));
// 期望：fixed 模式 + 笔一 39 → 半径 53.7×scale(5.52)≈296px → 中心457±296=[161,753]
console.log('fixed 期望 [161,753] | auto(39,79) 期望 [112,802]');
await browser.close();
