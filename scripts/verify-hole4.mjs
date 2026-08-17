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
  // pen 1 curve start (= pen 1 hole position)
  const curve = await import('/src/math/curve.ts');
  const ren = await import('/src/render/renderer.ts');
  const data = curve.sampleCurve(72, 30, 'inside', 40);
  const scale = 5.52;
  const sx = data.points[0] * scale + cx;
  const sy = data.points[1] * scale + cy;
  // rolling gear center (t=0: 42 units along x)
  const gcx = cx + 42 * scale, gcy = cy;
  // pen 1 hole in disc-local coords: frac=0.4, angle=0 -> distance from rolling center = 0.4×30×scale
  // existence of the 0.4 ring in the hole array is guaranteed by unit tests; here we verify the pen tip is drawn at the hole center
  const center = px(sx, sy); // should be the red pen tip
  const holeRing = px(sx - 3.5, sy); // near the hole outline (hollow circle edge 3.5px)
  // the hole array overall: the disc should have multiple hollow circle holes (at the 0.4/0.75 rings and the supplementary ring)
  // counting hole-outline pixels on the disc (within 160px radius of the rolling center) is hard; instead validate the hole-array function output
  const pattern = ren.generateHolePattern([{ hole: 40 }, { hole: 75 }]);
  const fracs = [...new Set(pattern.map((h) => h.frac))].sort((a, b) => a - b);
  return { center, holeRing, fracs, totalHoles: pattern.length };
});
const isRed = (p) => p[0] > 180 && p[1] < 130 && p[2] < 130;
const isDark = (p) => p[0] < 110 && p[1] < 130 && p[2] < 150 && p[0] > 30;
console.log('pen tip pixel:', r.center.join(','), isRed(r.center) ? 'OK pen tip at hole center' : 'WARN');
console.log('at hole edge 3.5px:', r.holeRing.join(','), isDark(r.holeRing) ? 'OK hole outline (hollow circle)' : 'WARN needs check');
console.log('hole array radius rings:', JSON.stringify(r.fracs.map(f => (f * 100).toFixed(0) + '%')));
console.log('total holes:', r.totalHoles, r.fracs.includes(0.4) && r.fracs.includes(0.75) ? 'OK includes pen param rings (40%/75%)' : 'WARN');
console.log('JS errors:', errors.length ? errors : 'none');
await browser.close();
