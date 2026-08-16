// B 场景：笔一变动像素的 after 颜色构成（覆盖 vs 移动）
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
await page.evaluate(() => {
  document.querySelector('#scale-seg button[data-scale="fixed"]').click();
});
const setHole = (idx, v) => page.evaluate(([i, val]) => {
  const s = document.querySelectorAll('.pen-card')[i].querySelector('.pen-hole');
  s.value = String(val);
  s.dispatchEvent(new Event('input'));
}, [idx, v]);
await setHole(0, 39); await setHole(1, 79);
await page.waitForTimeout(500);
const before = await page.evaluate(() => {
  const c = document.getElementById('canvas');
  return Array.from(c.getContext('2d').getImageData(0, 0, c.width, c.height).data);
});
await setHole(1, 40);
await page.waitForTimeout(400);
const after = await page.evaluate(() => {
  const c = document.getElementById('canvas');
  return Array.from(c.getContext('2d').getImageData(0, 0, c.width, c.height).data);
});

const isRedCore = (r, g, b) => Math.abs(r - 230) <= 3 && Math.abs(g - 57) <= 3 && Math.abs(b - 70) <= 3;
const isBlueCore = (r, g, b) => Math.abs(r - 29) <= 3 && Math.abs(g - 111) <= 3 && Math.abs(b - 165) <= 3;
const isBlueish = (r, g, b) => b > 100 && b - r > 40; // 偏蓝（覆盖或混色）
const isWhiteish = (r, g, b) => r > 230 && g > 230 && b > 230;

const colors = new Map();
let becameBlue = 0, becameWhite = 0, becameOther = 0, total = 0;
for (let i = 0; i < before.length; i += 4) {
  const r1 = before[i], g1 = before[i + 1], b1 = before[i + 2];
  if (!isRedCore(r1, g1, b1)) continue;
  const r2 = after[i], g2 = after[i + 1], b2 = after[i + 2];
  if (r2 === r1 && g2 === g1 && b2 === b1) continue;
  total++;
  const key = r2 + ',' + g2 + ',' + b2;
  colors.set(key, (colors.get(key) || 0) + 1);
  if (isBlueCore(r2, g2, b2)) becameBlue++;
  else if (isBlueish(r2, g2, b2)) becameBlue++;
  else if (isWhiteish(r2, g2, b2)) becameWhite++;
  else becameOther++;
}
console.log('笔一变动核心像素总数:', total);
console.log('→ 变成蓝色系（被笔二覆盖）:', becameBlue);
console.log('→ 变成白色系（笔一消失?）:', becameWhite);
console.log('→ 其他颜色:', becameOther);
console.log('颜色Top5:', [...colors.entries()].sort((x, y) => y[1] - x[1]).slice(0, 5));
console.log('判定:', becameOther === 0
  ? '✅ 全部变动都是"被笔二蓝覆盖"——笔一没有移动，只是被盖住了（物理叠印）'
  : '⚠ 存在其他颜色变动');
await browser.close();
