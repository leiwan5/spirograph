// 调试：采样点屏幕坐标 vs 画布实际红色像素分布
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
await page.waitForTimeout(300);

const dbg = await page.evaluate(async () => {
  const curve = await import('/src/math/curve.ts');
  const ren = await import('/src/render/renderer.ts');
  const c = document.getElementById('canvas');
  const rect = c.getBoundingClientRect();
  const W = Math.floor(rect.width), H = Math.floor(rect.height);
  console.log('canvas css:', rect.width, rect.height, '| pixel:', c.width, c.height, '| dpr:', window.devicePixelRatio);

  const data = curve.sampleCurve(72, 30, 'inside', 39);
  const pad = Math.max(24, Math.min(W, H) * 0.04);
  const t = ren.computeTransform(ren.computeFixedBounds(72, 30, 'inside'), W, H, pad);
  console.log('transform:', JSON.stringify(t));

  const step = Math.max(1, Math.floor(data.count / 1000));
  const pts = [];
  for (let i = 0; i < data.count; i += step) {
    const [x, y] = ren.applyTransform(t, data.points[2 * i], data.points[2 * i + 1]);
    pts.push([Math.round(x), Math.round(y)]);
  }
  // 红色像素实际分布
  const img = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let redCount = 0, minX = W, minY = H, maxX = 0, maxY = 0;
  const redSamples = [];
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      const i = (y * c.width + x) * 4;
      if (img[i] > 180 && img[i + 1] < 130 && img[i + 2] < 130) {
        redCount++;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
        if (redSamples.length < 3) redSamples.push([x, y]);
      }
    }
  }
  // 采样点处颜色
  function at(x, y) {
    if (x < 0 || y < 0 || x >= c.width || y >= c.height) return null;
    const i = (y * c.width + x) * 4;
    return [img[i], img[i + 1], img[i + 2]];
  }
  let hit = 0;
  const misses = [];
  for (const [x, y] of pts) {
    const p = at(x, y);
    if (p && !(p[0] === 255 && p[1] === 255 && p[2] === 255)) hit++;
    else if (misses.length < 4) misses.push([x, y, p]);
  }
  return {
    W, H, t,
    ptsMinMax: pts.reduce((a, p) => [Math.min(a[0], p[0]), Math.min(a[1], p[1]), Math.max(a[2], p[0]), Math.max(a[3], p[1])], [Infinity, Infinity, -Infinity, -Infinity]),
    redCount, redBox: [minX, minY, maxX, maxY], redSamples,
    hit, misses,
  };
});
console.log(JSON.stringify(dbg, null, 1));
await browser.close();
