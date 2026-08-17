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

const a = await page.evaluate(() => {
  const c = document.getElementById('canvas');
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;
  const img = ctx.getImageData(0, 0, W, H).data;
  const cx = W / 2, cy = H / 2;
  const scale = 5.52;
  const toothH = 7 / scale;
  const px = (x, y) => {
    const i = (Math.round(y) * W + Math.round(x)) * 4;
    return [img[i], img[i + 1], img[i + 2]];
  };
  // tooth tip circle radius (where the tip line is): R - 0.5*toothH
  const tipR = (72 - 0.5 * toothH) * scale;
  // sampling: walk along the tip circle, one point every 0.5px, count dark segments (tip lines)
  const N = 3600;
  let trans = 0;
  let prevDark = false;
  const darkRuns = [];
  for (let i = 0; i < N; i++) {
    const a2 = (i / N) * Math.PI * 2;
    const x = cx + tipR * Math.cos(a2);
    const y = cy + tipR * Math.sin(a2);
    const [r, g, b] = px(x, y);
    const dark = r < 225; // stroke alpha0.55 blended white ≈186, fill ≈238
    if (dark !== prevDark) { trans++; prevDark = dark; }
  }
  // rolling gear disc / hole ring
  const gcx = cx + (72 - 30) * scale, gcy = cy;
  const discR = 30 * scale;
  let holeCount = 0;
  for (let i = 0; i < 12; i++) {
    const a2 = (i / 12) * Math.PI * 2;
    const [r] = px(gcx + 0.75 * discR * Math.cos(a2), gcy + 0.75 * discR * Math.sin(a2));
    if (r < 200) holeCount++; // hole outline is darker
  }
  // overall light-fill check of the tooth band (ratio of non-white pixels at band middle 391px)
  let filled = 0;
  for (let i = 0; i < 720; i++) {
    const a2 = (i / 720) * Math.PI * 2;
    const [r] = px(cx + 391 * Math.cos(a2), cy + 391 * Math.sin(a2));
    if (r < 250) filled++;
  }
  return { tipR, transitions: trans, estimatedTeeth: trans / 2, holeCount, filledRatio: (filled / 720 * 100).toFixed(0) + '%' };
});
console.log('tooth tip circle radius:', a.tipR.toFixed(1), 'px');
console.log('light/dark alternations:', a.transitions, '-> estimated teeth:', a.estimatedTeeth, a.estimatedTeeth > 64 && a.estimatedTeeth < 80 ? 'OK 72 teeth correct' : 'WARN deviation');
console.log('12-hole outer ring sampling hits:', a.holeCount, 'holes');
console.log('tooth band light-fill ratio:', a.filledRatio);
await browser.close();
