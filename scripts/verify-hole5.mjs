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
  const curve = await import('/src/math/curve.ts');
  const data = curve.sampleCurve(72, 30, 'inside', 40);
  const scale = 5.52;
  const sx = data.points[0] * scale + cx;
  const sy = data.points[1] * scale + cy;
  // hole radius (pitch circle): 0.035×30×5.52 = 5.8px; pen tip = 5.8×0.72 = 4.2px
  // center: red pen tip; at 4.2px: hole outline (dark); at 7px: no white ring (should be background/curve color)
  const center = px(sx, sy);
  const tipEdge = px(sx - 4.2, sy);
  const holeEdge = px(sx - 5.8, sy);
  const beyond = px(sx - 7, sy); // white-ring position (should have no white ring)
  // find the actual center of the hole-outline ring: scan along +x for the dark hole outline (should be symmetric about sx)
  let leftDark = null, rightDark = null;
  for (let dx = 2; dx < 10; dx++) {
    const pL = px(sx - dx, sy);
    const pR = px(sx + dx, sy);
    const dark = (p) => p[0] < 130 && p[1] < 150 && p[2] < 170;
    if (leftDark === null && dark(pL)) leftDark = dx;
    if (rightDark === null && dark(pR)) rightDark = dx;
  }
  return { center, tipEdge, holeEdge, beyond, leftDark, rightDark };
});
const isRed = (p) => p[0] > 180 && p[1] < 130 && p[2] < 130;
const isDark = (p) => p[0] < 130 && p[1] < 150 && p[2] < 170;
const isWhiteish = (p) => p[0] > 200 && p[1] > 200 && p[2] > 200;
console.log('hole center (red pen tip):', r.center.join(','), isRed(r.center) ? 'OK' : 'WARN');
console.log('pen tip edge 4.2px:', r.tipEdge.join(','), 'hole outline 5.8px:', r.holeEdge.join(','), isDark(r.holeEdge) ? 'OK hole outline visible' : 'WARN');
console.log('white-ring position 7px:', r.beyond.join(','), !isWhiteish(r.beyond) ? 'OK no white ring' : 'WARN still has white ring');
console.log('hole-outline ring: left', r.leftDark, 'px | right', r.rightDark, 'px', r.leftDark !== null && r.rightDark !== null && Math.abs(r.leftDark - r.rightDark) <= 1 ? 'OK hole ring concentric with pen tip' : 'WARN off-center');
console.log('JS errors:', errors.length ? errors : 'none');
await browser.close();
