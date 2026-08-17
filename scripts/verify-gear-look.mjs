// Pixel-level verification of gear appearance: alternating teeth, disc fill, hole ring
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

const analysis = await page.evaluate(() => {
  const c = document.getElementById('canvas');
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;
  const img = ctx.getImageData(0, 0, W, H).data;
  const cx = W / 2, cy = H / 2;
  function px(x, y) {
    const i = (Math.round(y) * W + Math.round(x)) * 4;
    return [img[i], img[i + 1], img[i + 2]];
  }
  // ring tooth-band radius: R=72, scale=(864-69.12)/144=5.52 -> tooth band 388..394px, sample 391
  const ringBandR = (72 - 6 / 5.52) * 5.52;
  // sample around the ring, count alternations of "non-white pixels" (tooth vs valley)
  const N = 3600;
  let trans = 0;
  let prevDark = false;
  const darkCount = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const x = cx + ringBandR * Math.cos(a);
    const y = cy + ringBandR * Math.sin(a);
    const [r, g, b] = px(x, y);
    const isBg = r > 250 && g > 250 && b > 250;
    const dark = !isBg && r < 210; // gear outline (gray-blue ~118-150)
    if (dark !== prevDark) { trans++; prevDark = dark; }
  }
  // rolling gear: center (R-r)*scale = 232px -> (689,432), disc center, hole ring sampling
  const gcx = cx + (72 - 30) * 5.52, gcy = cy;
  const discR = 30 * 5.52;
  const centerColor = px(gcx, gcy);
  // 8 holes at 0.5r: check color difference at hole positions vs non-hole positions
  const holeR = 0.5 * discR;
  const holeColors = [];
  const solidColors = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    holeColors.push(px(gcx + holeR * Math.cos(a), gcy + holeR * Math.sin(a)));
    solidColors.push(px(gcx + (holeR + 0.1 * discR) * Math.cos(a), gcy + (holeR + 0.1 * discR) * Math.sin(a)));
  }
  const avg = (arr) => arr.reduce((s, p) => s + p[2], 0) / arr.length;
  return {
    ringBandR,
    toothTransitions: trans, // should be ≈ 72*2 = 144 (72 teeth × light/dark boundary ×2)
    estimatedTeeth: trans / 2,
    rollingCenter: centerColor,
    holeAvgBlue: avg(holeColors).toFixed(0),
    solidAvgBlue: avg(solidColors).toFixed(0),
    discR,
  };
});
console.log('ring tooth-band radius:', analysis.ringBandR.toFixed(1), 'px');
console.log('light/dark alternations around ring:', analysis.toothTransitions, '-> estimated teeth:', analysis.estimatedTeeth, analysis.estimatedTeeth > 60 && analysis.estimatedTeeth < 84 ? 'OK tooth shape correct (72 teeth)' : 'WARN');
console.log('rolling gear center color:', analysis.rollingCenter.join(','), '(should have light fill, not pure white)');
console.log('avg blue at hole ring vs disc surface:', analysis.holeAvgBlue, 'vs', analysis.solidAvgBlue, analysis.holeAvgBlue < analysis.solidAvgBlue ? 'OK hole ring visible (holes darker)' : 'WARN');
await browser.close();
