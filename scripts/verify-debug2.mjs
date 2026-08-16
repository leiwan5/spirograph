// 正确调试：设置 (39,79) 后对比红色像素实际范围 vs 笔一曲线采样范围
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
await page.waitForTimeout(600);

const dbg = await page.evaluate(async () => {
  const curve = await import('/src/math/curve.ts');
  const ren = await import('/src/render/renderer.ts');
  const c = document.getElementById('canvas');
  const rect = c.getBoundingClientRect();
  const W = Math.floor(rect.width), H = Math.floor(rect.height);
  const pad = Math.max(24, Math.min(W, H) * 0.04);
  const t = ren.computeTransform(ren.computeFixedBounds(72, 30, 'inside'), W, H, pad);
  const data = curve.sampleCurve(72, 30, 'inside', 39);
  const step = Math.max(1, Math.floor(data.count / 1000));
  const pts = [];
  for (let i = 0; i < data.count; i += step) {
    const [x, y] = ren.applyTransform(t, data.points[2 * i], data.points[2 * i + 1]);
    pts.push([Math.round(x), Math.round(y)]);
  }
  const img = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  const CW = c.width;
  let redCount = 0, minX = CW, minY = c.height, maxX = 0, maxY = 0;
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < CW; x++) {
      const i = (y * CW + x) * 4;
      if (img[i] > 180 && img[i + 1] < 130 && img[i + 2] < 130) {
        redCount++;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }
  function at(x, y) {
    if (x < 0 || y < 0 || x >= CW || y >= c.height) return null;
    const i = (y * CW + x) * 4;
    return [img[i], img[i + 1], img[i + 2]];
  }
  const hasInk = (x, y) => {
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        const p = at(x + dx, y + dy);
        if (p && !(p[0] === 255 && p[1] === 255 && p[2] === 255)) return true;
      }
    }
    return false;
  };
  let hit = 0;
  const missSamples = [];
  for (const [x, y] of pts) {
    if (hasInk(x, y)) hit++;
    else if (missSamples.length < 3) missSamples.push([x, y, at(x, y)]);
  }
  const ptsBox = pts.reduce((a, p) => [Math.min(a[0], p[0]), Math.min(a[1], p[1]), Math.max(a[2], p[0]), Math.max(a[3], p[1])], [Infinity, Infinity, -Infinity, -Infinity]);
  return {
    W, H, cw: CW, ch: c.height, pad, scale: t.scale,
    ptsBox, redBox: [minX, minY, maxX, maxY], redCount,
    hit, total: pts.length, missSamples,
  };
});
console.log(JSON.stringify(dbg, null, 1));
await browser.close();
