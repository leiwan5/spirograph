// 修正版：每个场景独立 setup(39,79) → before → 只变一支 → after
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
async function grab() {
  return page.evaluate(() => {
    const c = document.getElementById('canvas');
    return Array.from(c.getContext('2d').getImageData(0, 0, c.width, c.height).data);
  });
}
// 实线核心像素：与纯色精确一致（±3 容差）
const isRedCore = (r, g, b) => Math.abs(r - 230) <= 3 && Math.abs(g - 57) <= 3 && Math.abs(b - 70) <= 3;
const isBlueCore = (r, g, b) => Math.abs(r - 29) <= 3 && Math.abs(g - 111) <= 3 && Math.abs(b - 165) <= 3;

async function scenario(label, change) {
  await setHole(0, 39); await setHole(1, 79);
  await page.waitForTimeout(500);
  const before = await grab();
  await change();
  await page.waitForTimeout(400);
  const after = await grab();
  let redMoved = 0, blueMoved = 0;
  for (let i = 0; i < before.length; i += 4) {
    const r1 = before[i], g1 = before[i + 1], b1 = before[i + 2];
    const r2 = after[i], g2 = after[i + 1], b2 = after[i + 2];
    if (r1 === r2 && g1 === g2 && b1 === b2) continue;
    if (isRedCore(r1, g1, b1)) redMoved++;
    if (isBlueCore(r1, g1, b1)) blueMoved++;
  }
  console.log(label, '→ 笔一实线核心变动:', redMoved, '| 笔二实线核心变动:', blueMoved);
  return { redMoved, blueMoved };
}

const a = await scenario('A 变动笔一 39→20（观察笔二）', () => setHole(0, 20));
const b = await scenario('B 变动笔二 79→40（观察笔一）', () => setHole(1, 40));
console.log('A 判定:', a.blueMoved === 0 ? '✅ 变动笔一，笔二核心像素完全不动' : '⚠ 笔二核心像素动了 ' + a.blueMoved);
console.log('B 判定:', b.redMoved === 0 ? '✅ 变动笔二，笔一核心像素完全不动' : '⚠ 笔一核心像素动了 ' + b.redMoved);
await browser.close();
