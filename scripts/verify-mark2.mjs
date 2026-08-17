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

const r = await page.evaluate(() => {
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
  const gcx = cx + 42 * scale, gcy = cy;
  const spin = 5.96 * Math.PI / 180;
  // dense sampling: rolling center -> pen tip 66px, every 4px
  const trace = [];
  for (let d = 4; d <= 66; d += 4) {
    trace.push({ d, color: px(gcx + d * Math.cos(spin), gcy + d * Math.sin(spin)) });
  }
  return trace;
});
// decision: faint red line (alpha 0.6 red mixed with white) or pure red tip: r > 140 and r-b > 40
const reddish = (p) => p[0] > 140 && p[0] - p[2] > 40;
const bad = r.trace.filter((t) => !reddish(t.color));
console.log('samples:', r.trace.length, '| non-red points:', bad.length ? JSON.stringify(bad) : 'none');
console.log('all continuously red:', bad.length === 0 ? '✅ red line extends continuously from the rolling center to the pen tip' : '⚠');
console.log('JS errors:', errors.length ? errors : 'none');
await browser.close();
