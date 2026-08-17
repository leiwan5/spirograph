import { chromium } from 'playwright-core';
const EDGE = '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
const browser = await chromium.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
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
  const curve = await import('/src/math/curve.ts');
  const data = curve.sampleCurve(72, 30, 'inside', 40);
  // Sample precisely along the curve points (near the start, 0-40px, avoiding the pen two crossing region - the start direction is pen one's own territory)
  // Note: the start is in the +x direction, and the pen two curve (75%) is also nearby... use dense sampling hugging the curve
  const trace = [];
  const step = 3;
  for (let idx = 120; idx >= 0; idx -= step) {
    const x = data.points[2 * idx] * scale + cx;
    const y = data.points[2 * idx + 1] * scale + cy;
    const p = px(x, y);
    const dist = Math.hypot(data.points[2 * idx] - data.points[0], data.points[2 * idx + 1] - data.points[1]) * scale;
    trace.push({ dist: dist.toFixed(1), color: p.join(',') });
  }
  return trace;
});
const isReddish = (p) => {
  const [rr, g, b] = p.split(',').map(Number);
  return rr > 140 && rr - b > 40;
};
let gaps = [];
let prevRed = false;
for (const t of r) {
  const red = isReddish(t.color);
  if (!red && prevRed) gaps.push('distance from start ' + t.dist + 'px (' + t.color + ')');
  prevRed = red;
}
console.log('curve samples near the start (0-40px):');
for (const t of r.slice(0, 14)) console.log('  ' + t.dist + 'px |', t.color);
console.log('break points (red->non-red):', gaps.length ? gaps : 'none ✅ curve continuous');
await browser.close();
