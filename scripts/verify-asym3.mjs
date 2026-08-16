// 深挖 C 场景：fixed 模式变动笔二，笔一"实线中心"像素是否真的移动
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

await page.evaluate(() => {
  document.querySelector('#scale-seg button[data-scale="fixed"]').click();
});
const setHole = (penIdx, v) => page.evaluate(([idx, val]) => {
  const slider = document.querySelectorAll('.pen-card')[idx].querySelector('.pen-hole');
  slider.value = String(val);
  slider.dispatchEvent(new Event('input'));
}, [penIdx, v]);

await setHole(0, 39); await setHole(1, 79);
await page.waitForTimeout(500);
const before = await page.evaluate(() => {
  const c = document.getElementById('canvas');
  return Array.from(c.getContext('2d').getImageData(0, 0, c.width, c.height).data);
});
await setHole(1, 40);
await page.waitForTimeout(500);
const after = await page.evaluate(() => {
  const c = document.getElementById('canvas');
  return Array.from(c.getContext('2d').getImageData(0, 0, c.width, c.height).data);
});

// 统计 before 中"笔一实线中心像素"(纯红) 的变动情况
const pureRed = (r, g, b) => r > 200 && g < 100 && b < 100;
const pureBlue = (r, g, b) => b > 130 && g > 90 && g < 135 && r < 60;
let redCore = 0, redCoreMoved = 0, blueCore = 0, blueCoreMoved = 0;
const movedAfterColors = new Map();
for (let i = 0; i < before.length; i += 4) {
  const r1 = before[i], g1 = before[i + 1], b1 = before[i + 2];
  const r2 = after[i], g2 = after[i + 1], b2 = after[i + 2];
  if (pureRed(r1, g1, b1)) {
    redCore++;
    if (r2 !== r1 || g2 !== g1 || b2 !== b1) {
      redCoreMoved++;
      const key = r2 + ',' + g2 + ',' + b2;
      movedAfterColors.set(key, (movedAfterColors.get(key) || 0) + 1);
    }
  }
  if (pureBlue(r1, g1, b1)) {
    blueCore++;
    if (r2 !== r1 || g2 !== g1 || b2 !== b1) blueCoreMoved++;
  }
}
console.log('笔一实线中心像素:', redCore, '| 变动:', redCoreMoved);
console.log('笔二实线中心像素:', blueCore, '| 变动:', blueCoreMoved);
console.log('笔一变动像素的 after 颜色 Top5:', [...movedAfterColors.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5));
await browser.close();
