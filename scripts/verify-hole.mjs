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
  // pixel at start (should be: dark hole bottom + red pen tip centered)
  const p = px(sx, sy);
  const around = [
    px(sx - 3, sy), px(sx + 3, sy), px(sx, sy - 3), px(sx, sy + 3),
  ];
  // consistency of curve start with the rolling-gear hole position (formula) is guaranteed by unit tests; here we verify the rendering
  return {
    startPixel: p,
    around,
    holeParam: 40,
    startRadius: Math.hypot(data.points[0], data.points[1]).toFixed(2),
    expectedHoleRadius: (0.4 * 30).toFixed(2),
  };
});
console.log('pen1 curve start pixel:', r.startPixel.join(','), '(dark hole bottom + red tip ≈ near 90,50,60)');
console.log('around start (±3px):', JSON.stringify(r.around));
console.log('hole radius:', r.startRadius, '= param 40%×r =', r.expectedHoleRadius, r.startRadius === r.expectedHoleRadius ? 'OK hole = current param' : 'WARN');
console.log('JS errors:', errors.length ? errors : 'none');

// animation: pen hole follows to the curve endpoint
await page.click('#play');
await page.waitForTimeout(1200);
const anim = await page.evaluate(async () => {
  const c = document.getElementById('canvas');
  const img = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  const W = c.width;
  const px = (x, y) => {
    const i = (Math.round(y) * W + Math.round(x)) * 4;
    return [img[i], img[i + 1], img[i + 2]];
  };
  // animation progress ~4% (speed 1, 1.2s/15s), within pen 1: curve point ~240
  const curve = await import('/src/math/curve.ts');
  const ren = await import('/src/render/renderer.ts');
  const data = curve.sampleCurve(72, 30, 'inside', 40);
  const idx = Math.floor(0.04 * data.count);
  const scale = 5.52;
  const ex = data.points[2 * idx] * scale + W / 2;
  const ey = data.points[2 * idx + 1] * scale + c.height / 2;
  return { endpointPixel: px(ex, ey), endpointRadius: Math.hypot(data.points[2 * idx], data.points[2 * idx + 1]).toFixed(2) };
});
console.log('curve endpoint pixel during animation:', anim.endpointPixel.join(','), '(should contain dark hole bottom + red pen tip)');
await page.click('#play');
await browser.close();
