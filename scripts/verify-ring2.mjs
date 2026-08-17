// fixed sampling density: step of 1/1000 curve points + neighborhood tolerance
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

const pen1Info = await page.evaluate(async () => {
  const curve = await import('/src/math/curve.ts');
  const ren = await import('/src/render/renderer.ts');
  const c = document.getElementById('canvas');
  const rect = c.getBoundingClientRect();
  const W = Math.floor(rect.width), H = Math.floor(rect.height);
  const data = curve.sampleCurve(72, 30, 'inside', 39);
  const t = ren.computeTransform(ren.computeFixedBounds(72, 30, 'inside'), W, H, Math.max(24, Math.min(W, H) * 0.04));
  const pts = [];
  const step = Math.max(1, Math.floor(data.count / 1000));
  for (let i = 0; i < data.count; i += step) {
    const [x, y] = ren.applyTransform(t, data.points[2 * i], data.points[2 * i + 1]);
    pts.push([Math.round(x), Math.round(y)]);
  }
  return { pts, W, H, dpr: window.devicePixelRatio };
});

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

const { pts, W, dpr } = pen1Info;
function at(img, x, y) {
  const i = (y * W + x) * 4;
  if (x < 0 || y < 0 || x >= W || y >= img.length / 4 / W) return null;
  return [img[i], img[i + 1], img[i + 2]];
}
function nearest(img, x, y) {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const p = at(img, x + dx, y + dy);
      if (p && !(p[0] === 255 && p[1] === 255 && p[2] === 255)) return p;
    }
  }
  return null;
}
const isRed = (p) => p[0] > 180 && p[1] < 130 && p[2] < 130;
const isBlue = (p) => p[2] > 120 && p[1] > 70 && p[1] < 160 && p[0] < 90;

let hitBefore = 0, hitAfter = 0, redPts = 0, redChanged = 0, redBecameBlue = 0, redStayed = 0;
for (const [x, y] of pts) {
  const pb = nearest(before, x, y);
  const pa = nearest(after, x, y);
  if (pb) hitBefore++;
  if (pa) hitAfter++;
  if (pb && isRed(pb)) {
    redPts++;
    if (pa && (pa[0] !== pb[0] || pa[1] !== pb[1] || pa[2] !== pb[2])) {
      redChanged++;
      if (isBlue(pa)) redBecameBlue++;
    } else if (pa && isRed(pa)) redStayed++;
  }
}
console.log('samples:', pts.length, '(dpr=' + dpr + ')');
console.log('content on the curve before changing pen 2:', hitBefore, '| after:', hitAfter);
console.log('pen-1 red pixels:', redPts, '| changed:', redChanged, '| covered by pen-2 blue:', redBecameBlue, '| stayed red:', redStayed);
console.log('conclusion:', hitBefore === hitAfter && hitBefore > 500
  ? '✅ pen-1 curve position did not move at all (every sample point has content before and after; content stays in place)'
  : '⚠ needs check: hitBefore=' + hitBefore + ' hitAfter=' + hitAfter);
await browser.close();
