// 修正验证1：勾选前后画布差异（齿轮像素）
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

async function grab() {
  return page.evaluate(() => {
    const c = document.getElementById('canvas');
    return Array.from(c.getContext('2d').getImageData(0, 0, c.width, c.height).data);
  });
}

const before = await grab();
await page.evaluate(() => {
  document.getElementById('show-gears').click();
});
await page.waitForTimeout(500);
const after = await grab();

let diff = 0;
const diffColors = new Map();
for (let i = 0; i < before.length; i += 4) {
  if (before[i] !== after[i] || before[i + 1] !== after[i + 1] || before[i + 2] !== after[i + 2]) {
    diff++;
    const key = after[i] + ',' + after[i + 1] + ',' + after[i + 2];
    diffColors.set(key, (diffColors.get(key) || 0) + 1);
  }
}
console.log('勾选后新增像素:', diff);
console.log('新增像素主要颜色（应为半透明灰系）:', [...diffColors.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4));

// 检查 state 与 checkbox 同步
const st = await page.evaluate(() => ({
  state: window.__dshStore.getState().showGears,
  checked: document.getElementById('show-gears').checked,
}));
console.log('状态同步:', JSON.stringify(st), st.state === true && st.checked === true ? '✅' : '⚠');
await browser.close();
