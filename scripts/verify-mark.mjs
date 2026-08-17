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
// pen 1 at 40% (static current pen = 0): the red line should reach 0.4×30×5.52=66px
await page.goto('http://localhost:5273/?ring=72&rolling=30&pen=40,e63946,2.5&pen=75,1d6fa5,2&scale=fixed&gears=1', { waitUntil: 'networkidle' });
await page.waitForTimeout(700);

const r = await page.evaluate(async () => {
  const c = document.getElementById('canvas');
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;
  const img = ctx.getImageData(0, 0, W, H).data;
  const cx = W / 2, cy = H / 2;
  const scale = 5.52;
  const px = (x, y) => {
    const i = (Math.round(y) * W + Math.round(x)) * 4;
    return [img[i], img[i + 1], img[i + 2]];
  };
  // rolling center (t=0: 42 units in the x direction)
  const gcx = cx + 42 * scale, gcy = cy;
  // pen-1 hole: 0.4×30×5.52 = 66px, local angle 0 (at t=0 self-rotation = meshPhase, but the red line is drawn in local coords under rotate)
  // red line end = rolling center + 66px (local x axis, after spin rotation) -> at t=0 spin=5.96°: direction 5.96°
  const spin = 5.96 * Math.PI / 180;
  const tipX = gcx + 66 * Math.cos(spin);
  const tipY = gcy + 66 * Math.sin(spin);
  // sample along the red-line direction from the rolling center to the pen tip: should be continuous red
  const trace = [];
  for (let d = 10; d <= 66; d += 8) {
    const x = gcx + d * Math.cos(spin);
    const y = gcy + d * Math.sin(spin);
    trace.push({ d, color: px(x, y).join(',') });
  }
  // pixel at the pen tip (pen-1 hole center, curve start point)
  const curve = await import('/src/math/curve.ts');
  const data = curve.sampleCurve(72, 30, 'inside', 40);
  const tipPixel = px(data.points[0] * scale + cx, data.points[1] * scale + cy);
  return { trace, tipPixel };
});
console.log('sample along red line (rolling center -> pen tip 66px):');
for (const t of r.trace) console.log('  ' + t.d + 'px |', t.color);
const reddish = (p) => { const [rr, g, b] = p.split(',').map(Number); return rr > 140 && rr - b > 40; };
console.log('all red:', r.trace.every((t) => reddish(t.color)) ? '✅ red line reaches the pen tip continuously' : '⚠ disappears midway');
console.log('at pen tip:', r.tipPixel.join(','), reddish(r.tipPixel) ? '(tip is red)' : '');
console.log('JS errors:', errors.length ? errors : 'none');
await browser.close();
