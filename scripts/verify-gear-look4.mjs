// Clean validation: sample the ring gear's tooth tips/valleys along the 90° direction (where the rolling gear does not occlude)
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
  const tipR = (72 - 0.5 * toothH) * scale;  // 394.1 tooth tip (tip line)
  const rootR = (72 - 1.5 * toothH) * scale; // 387.0 tooth root (valley floor)
  const step = Math.PI * 2 / 72;
  const px = (x, y) => {
    const i = (Math.round(y) * W + Math.round(x)) * 4;
    return [img[i], img[i + 1], img[i + 2]];
  };
  // start at angle 95° (avoid the rolling gear occlusion zone ±48°), find all 72 teeth
  let tipDark = 0, rootDark = 0;
  const base = (95 * Math.PI) / 180;
  for (let i = 0; i < 72; i++) {
    const at = base + (i + 0.5) * step; // tooth tip center
    const ag = base + (i + 1.0) * step; // tooth valley center
    const pTip = px(cx + tipR * Math.cos(at), cy + tipR * Math.sin(at));
    const pRoot = px(cx + rootR * Math.cos(ag), cy + rootR * Math.sin(ag));
    if (pTip[0] < 215) tipDark++;
    if (pRoot[0] < 215) rootDark++;
  }
  return { tipDark, rootDark };
});
console.log('tooth tip center dark (tip line):', a.tipDark, '/72', a.tipDark >= 62 ? 'OK 72 flat-top teeth correct' : 'WARN');
console.log('tooth valley center dark (should be few):', a.rootDark, '/72', a.rootDark <= 10 ? 'OK valley floor clean' : 'WARN');
await browser.close();
