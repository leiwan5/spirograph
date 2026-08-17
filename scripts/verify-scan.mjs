// Radial scan: output color pixel by pixel from 360px to 400px (tooth band area)
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

const scan = await page.evaluate(() => {
  const c = document.getElementById('canvas');
  const ctx = c.getContext('2d');
  const W = c.width;
  const img = ctx.getImageData(0, 0, W, c.height).data;
  const cx = W / 2, cy = c.height / 2;
  const px = (x, y) => {
    const i = (Math.round(y) * W + Math.round(x)) * 4;
    return [img[i], img[i + 1], img[i + 2]];
  };
  // along the positive x-axis (angle 0, may land on a tooth tip or valley)
  // angle 0.5*step (tooth tip center): from 380 to 400
  const step = Math.PI * 2 / 72;
  const out = [];
  for (const angle of [0.5 * step, 1.0 * step, 0.2 * step]) {
    const row = [];
    for (let rad = 380; rad <= 400; rad += 1) {
      const p = px(cx + rad * Math.cos(angle), cy + rad * Math.sin(angle));
      row.push(rad + ':' + p.join(','));
    }
    out.push({ angle: (angle / step).toFixed(1) + 'step', row });
  }
  return out;
});
for (const s of scan) {
  console.log('Angle ' + s.angle + ':');
  console.log('  ' + s.row.join(' | '));
}
await browser.close();
