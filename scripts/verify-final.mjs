// 用户核心场景终验（修复后）：
// A) 环固定 + 72/30 + 39/79：变动笔一 → 笔二纹丝不动
// B) 环固定 + 72/30 + 39/79：变动笔二 → 笔一位置不动（只可能被笔二覆盖）
// C) 环像素恒定：72+30 与 96+63 下 hole=100 曲线都贴环内沿（半径 = 理论值）
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
const pureRed = (r, g, b) => r > 200 && g < 100 && b < 100;
const pureBlue = (r, g, b) => b > 130 && g > 90 && g < 135 && r < 60;

async function measure(label, change) {
  const before = await grab();
  await change();
  await page.waitForTimeout(400);
  const after = await grab();
  let redMoved = 0, blueMoved = 0, redToBlue = 0;
  for (let i = 0; i < before.length; i += 4) {
    const r1 = before[i], g1 = before[i + 1], b1 = before[i + 2];
    const r2 = after[i], g2 = after[i + 1], b2 = after[i + 2];
    if (r1 === r2 && g1 === g2 && b1 === b2) continue;
    if (pureRed(r1, g1, b1)) {
      redMoved++;
      if (pureBlue(r2, g2, b2)) redToBlue++;
    }
    if (pureBlue(r1, g1, b1)) blueMoved++;
  }
  console.log(label, '→ 笔一(红)变动:', redMoved, '| 笔二(蓝)变动:', blueMoved, '| 红变蓝(被覆盖):', redToBlue);
  return { redMoved, blueMoved };
}

await setHole(0, 39); await setHole(1, 79);
await page.waitForTimeout(500);

// A: 变动笔一 39→20
let a = await measure('A 变动笔一 39→20', () => setHole(0, 20));
// B: 变动笔二 79→40（复位笔一）
let b = await measure('B 变动笔二 79→40', async () => { await setHole(0, 39); await setHole(1, 40); });

// C: 环像素恒定（用正确 mode 重新验证）
const ring = await page.evaluate(async () => {
  const curve = await import('/src/math/curve.ts');
  const ren = await import('/src/render/renderer.ts');
  const c = document.getElementById('canvas');
  const rect = c.getBoundingClientRect();
  const W = Math.floor(rect.width), H = Math.floor(rect.height);
  const pad = Math.max(24, Math.min(W, H) * 0.04);
  function maxR(R, r) {
    const d = curve.sampleCurve(R, r, 'inside', 100);
    const t = ren.computeTransform(ren.computeFixedBounds(R, r, 'inside'), W, H, pad);
    let m = 0;
    for (let i = 0; i < d.count; i += 7) {
      const [x, y] = ren.applyTransform(t, d.points[2 * i], d.points[2 * i + 1]);
      m = Math.max(m, Math.hypot(x - W / 2, y - H / 2));
    }
    return m;
  }
  return { r72: maxR(72, 30), r96: maxR(96, 63), expected: (Math.min(W, H) - 2 * pad) / 2 };
});

console.log('C 环半径: 72+30 =', ring.r72.toFixed(1), '| 96+63 =', ring.r96.toFixed(1), '| 理论 =', ring.expected.toFixed(1),
  Math.abs(ring.r72 - ring.r96) < 1 && Math.abs(ring.r72 - ring.expected) < 3 ? '✅ 环恒定' : '⚠ 异常');

// 结论判定
console.log('A 判定:', a.blueMoved === 0 ? '✅ 变动笔一，笔二纹丝不动' : '⚠ 笔二动了');
console.log('B 判定:', b.redToBlue === b.redMoved
  ? '✅ 笔一所有变动都来自"被笔二新曲线覆盖"（位置未移动）'
  : (b.redMoved === 0 ? '✅ 笔一完全没动' : '⚠ 笔一存在非覆盖性变动 ' + (b.redMoved - b.redToBlue)));
await browser.close();
