// Precise validation: colors at the centers of all 72 tooth tips vs tooth valleys
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
  const tipR = (72 - 0.5 * toothH) * scale; // tooth tip circle (at the tip line)
  const rootR = (72 - 1.5 * toothH) * scale; // tooth root circle (valley floor)
  const step = Math.PI * 2 / 72;
  const px = (x, y) => {
    const i = (Math.round(y) * W + Math.round(x)) * 4;
    return [img[i], img[i + 1], img[i + 2]];
  };
  let tipDark = 0, rootDark = 0;
  const samples = [];
  for (let i = 0; i < 72; i++) {
    // tooth tip center (midpoint of the tip line)
    const at = (i + 0.5) * step;
    const pTip = px(cx + tipR * Math.cos(at), cy + tipR * Math.sin(at));
    if (pTip[0] < 215) tipDark++;
    // tooth valley center (between two teeth, near the root circle)
    const ag = (i + 1.0) * step;
    const pRoot = px(cx + rootR * Math.cos(ag), cy + rootR * Math.sin(ag));
    if (pRoot[0] < 215) rootDark++;
    if (i < 4) samples.push({ tip: pTip, root: pRoot });
  }
  return { tipDark, rootDark, samples };
});
console.log('tooth tip center dark:', a.tipDark, '/72', a.tipDark >= 60 ? 'OK tooth shape clear' : 'WARN');
console.log('tooth valley center dark:', a.rootDark, '/72', a.rootDark <= 12 ? 'OK valley floor clean' : 'WARN (valley has fill)');
console.log('first 4 tooth samples:', JSON.stringify(a.samples));
await browser.close();
