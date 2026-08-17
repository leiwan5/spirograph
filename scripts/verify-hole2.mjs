import { chromium } from 'playwright-core';
const EDGE = '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
const browser = await chromium.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://localhost:5273/?ring=72&rolling=30&pen=40,e63946,2.5&pen=75,1d6fa5,2&scale=fixed&gears=1', { waitUntil: 'networkidle' });
await page.waitForTimeout(700);

const r = await page.evaluate(async () => {
  const c = document.getElementById('canvas');
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;
  const img = ctx.getImageData(0, 0, W, H).data;
  const cx = W / 2, cy = H / 2;
  const px = (x, y) => {
    const i = (Math.round(y) * W + Math.round(x)) * 4;
    return [img[i], img[i + 1], img[i + 2]];
  };
  // pen 1 curve start (curve coordinates -> screen)
  const curve = await import('/src/math/curve.ts');
  const data = curve.sampleCurve(72, 30, 'inside', 40);
  const scale = 5.52;
  const sx = data.points[0] * scale + cx;
  const sy = data.points[1] * scale + cy;
  // start center + cross sampling: center should be the red pen tip, surroundings dark hole bottom
  const center = px(sx, sy);
  const ring = [px(sx - 4, sy), px(sx + 4, sy), px(sx, sy - 4), px(sx, sy + 4)];
  // hole radius on the rolling gear disc (math validation): distance from start to rolling center (42,0) = 40%×30 = 12
  const holeR = Math.hypot(data.points[0] - 42, data.points[1]);
  return { center, ring, holeR };
});
const isRed = (p) => p[0] > 180 && p[1] < 130 && p[2] < 130;
const isDark = (p) => p[0] < 110 && p[1] < 130 && p[2] < 150 && p[0] > 30;
console.log('hole center pixel (should be red pen tip):', r.center.join(','), isRed(r.center) ? 'OK pen tip at hole center' : 'WARN');
console.log('around hole bottom (should be dark):', JSON.stringify(r.ring), r.ring.every(isDark) ? 'OK dark hole bottom surrounds' : 'WARN');
console.log('hole radius on disc:', r.holeR.toFixed(2), '= param 40%×30 = 12', Math.abs(r.holeR - 12) < 0.01 ? 'OK hole = current param' : 'WARN');
console.log('JS errors:', errors.length ? errors : 'none');
await browser.close();
