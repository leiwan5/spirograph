// 环固定模式核心验证：
// 1) 变动笔二(79→40)：笔一曲线屏幕坐标集合前后完全一致（位置没动，只是被覆盖）
// 2) 内切环像素大小恒定（72+30 与 96+63 下 hole=100 曲线都恰好贴环内沿）
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

const setHole = (idx, v) => page.evaluate(([i, val]) => {
  const s = document.querySelectorAll('.pen-card')[i].querySelector('.pen-hole');
  s.value = String(val);
  s.dispatchEvent(new Event('input'));
}, [idx, v]);

await setHole(0, 39); await setHole(1, 79);
await page.waitForTimeout(500);

// 用页面里的模块复算：笔一曲线(hole=39) + 环固定 transform → 屏幕坐标
const pen1ScreenPts = await page.evaluate(async () => {
  const curve = await import('/src/math/curve.ts');
  const ren = await import('/src/render/renderer.ts');
  const c = document.getElementById('canvas');
  const rect = c.getBoundingClientRect();
  const W = Math.floor(rect.width), H = Math.floor(rect.height);
  const data = curve.sampleCurve(72, 30, 'inside', 39);
  const bounds = ren.computeFixedBounds(72, 30, 'inside');
  const t = ren.computeTransform(bounds, W, H, Math.max(24, Math.min(W, H) * 0.04));
  const pts = [];
  const step = Math.max(1, Math.floor(data.count / 300));
  for (let i = 0; i < data.count; i += step) {
    const [x, y] = ren.applyTransform(t, data.points[2 * i], data.points[2 * i + 1]);
    pts.push([Math.round(x), Math.round(y)]);
  }
  return { pts, W, H };
});

// 抓像素
async function grab() {
  return page.evaluate(() => {
    const c = document.getElementById('canvas');
    return Array.from(c.getContext('2d').getImageData(0, 0, c.width, c.height).data);
  });
}
const before = await grab();
await setHole(1, 40);
await page.waitForTimeout(500);
const after = await grab();

const W = pen1ScreenPts.W;
function at(img, x, y) {
  if (x < 0 || y < 0 || x >= W || y >= img.length / 4 / W) return null;
  const i = (y * W + x) * 4;
  return [img[i], img[i + 1], img[i + 2]];
}
const isRed = (p) => p && p[0] > 180 && p[1] < 130 && p[2] < 130;
const isBlue = (p) => p && p[2] > 120 && p[1] > 70 && p[1] < 160 && p[0] < 90;
const isBg = (p) => p && p[0] === 255 && p[1] === 255 && p[2] === 255;

let sampled = 0, onCurveBefore = 0, onCurveAfter = 0, redPts = 0, redChanged = 0, redBecameBlue = 0;
for (const [x, y] of pen1ScreenPts.pts) {
  sampled++;
  const pb = at(before, x, y);
  const pa = at(after, x, y);
  if (pb && !isBg(pb)) onCurveBefore++;
  if (pa && !isBg(pa)) onCurveAfter++;
  if (pb && isRed(pb)) {
    redPts++;
    if (pa && (pa[0] !== pb[0] || pa[1] !== pb[1] || pa[2] !== pb[2])) {
      redChanged++;
      if (isBlue(pa)) redBecameBlue++;
    }
  }
}
console.log('笔一曲线采样点:', sampled);
console.log('改笔二前 曲线经过处有内容的点:', onCurveBefore, '| 改后:', onCurveAfter);
console.log('笔一红像素点:', redPts, '| 变动:', redChanged, '| 其中变成笔二蓝(被覆盖):', redBecameBlue);
console.log('结论:', onCurveBefore === onCurveAfter
  ? '✅ 笔一曲线屏幕位置完全没动（内容还在原地，只是部分被笔二新曲线覆盖）'
  : '⚠ 笔一位置变了');

// 环像素恒定验证：hole=100 曲线恰好贴环内沿，且 72+30 与 96+63 下环像素半径相同
const ringCheck = await page.evaluate(async () => {
  const curve = await import('/src/math/curve.ts');
  const ren = await import('/src/render/renderer.ts');
  const c = document.getElementById('canvas');
  const rect = c.getBoundingClientRect();
  const W = Math.floor(rect.width), H = Math.floor(rect.height);
  const pad = Math.max(24, Math.min(W, H) * 0.04);
  function maxScreenR(R, r) {
    const data = curve.sampleCurve(R, r, 'inside', 100);
    const t = ren.computeTransform(ren.computeFixedBounds(R, r, 'inside'), W, H, pad);
    let max = 0;
    const step = Math.max(1, Math.floor(data.count / 500));
    for (let i = 0; i < data.count; i += step) {
      const [x, y] = ren.applyTransform(t, data.points[2 * i], data.points[2 * i + 1]);
      const d = Math.hypot(x - W / 2, y - H / 2);
      if (d > max) max = d;
    }
    return max;
  }
  const r72 = maxScreenR(72, 30);
  const r96 = maxScreenR(96, 63);
  return { r72, r96, expected: (Math.min(W, H) - 2 * pad) / 2 };
});
console.log('环像素半径(72+30):', ringCheck.r72.toFixed(1), '| (96+63):', ringCheck.r96.toFixed(1), '| 理论:', ringCheck.expected.toFixed(1));
console.log('结论:', Math.abs(ringCheck.r72 - ringCheck.r96) < 1 && Math.abs(ringCheck.r72 - ringCheck.expected) < 3
  ? '✅ 环像素大小恒定且图案恰好贴环内沿'
  : '⚠ 环不恒定');
await browser.close();
