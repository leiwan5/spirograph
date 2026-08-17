// scan along the rolling tooth-tip direction (5°, includes meshing phase -1° + local 6°)
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

const r = await page.evaluate(() => {
  const c = document.getElementById('canvas');
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;
  const img = ctx.getImageData(0, 0, W, H).data;
  const cx = W / 2, cy = H / 2;
  const px = (x, y) => {
    const i = (Math.round(y) * W + Math.round(x)) * 4;
    return [img[i], img[i + 1], img[i + 2]];
  };
  // tooth-tip direction 5° (= meshPhase -1° + 0.5·stepRoll 6°), tooth-valley direction 11°
  const rows = [];
  for (const deg of [5, 11]) {
    const a = (deg * Math.PI) / 180;
    const row = [];
    for (let rad = 388; rad <= 408; rad += 2) {
      const p = px(cx + rad * Math.cos(a), cy + rad * Math.sin(a));
      row.push(rad + ':' + p.join(','));
    }
    rows.push({ deg, row });
  }
  // max radius of dark pixels (tooth stroke, excluding ring outer edge 404.9±2)
  let deepest = 0;
  const a5 = (5 * Math.PI) / 180;
  for (let rad = 388; rad <= 403; rad += 1) {
    const p = px(cx + rad * Math.cos(a5), cy + rad * Math.sin(a5));
    if (p[0] < 215) deepest = rad;
  }
  return { rows, deepest };
});
for (const row of r.rows) {
  console.log(row.deg + '°: ' + row.row.join(' | '));
}
console.log('5° direction 388-403px farthest dark tooth:', r.deepest, 'px (theoretical rolling tooth tip ≈398.5, ring valley bottom ≈399.8)');
console.log('result:', r.deepest <= 399 ? '✅ rolling tooth tip is inside the ring valley bottom (does not exceed)' : '⚠ still exceeds');
await browser.close();
