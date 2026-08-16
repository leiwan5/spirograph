// 精确验证：72 个齿顶中心点 vs 齿谷中心点的颜色
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
  const tipR = (72 - 0.5 * toothH) * scale; // 齿顶圆（横线处）
  const rootR = (72 - 1.5 * toothH) * scale; // 齿根圆（谷底）
  const step = Math.PI * 2 / 72;
  const px = (x, y) => {
    const i = (Math.round(y) * W + Math.round(x)) * 4;
    return [img[i], img[i + 1], img[i + 2]];
  };
  let tipDark = 0, rootDark = 0;
  const samples = [];
  for (let i = 0; i < 72; i++) {
    // 齿顶中心（横线中点）
    const at = (i + 0.5) * step;
    const pTip = px(cx + tipR * Math.cos(at), cy + tipR * Math.sin(at));
    if (pTip[0] < 215) tipDark++;
    // 齿谷中心（两齿之间，齿根圆附近）
    const ag = (i + 1.0) * step;
    const pRoot = px(cx + rootR * Math.cos(ag), cy + rootR * Math.sin(ag));
    if (pRoot[0] < 215) rootDark++;
    if (i < 4) samples.push({ tip: pTip, root: pRoot });
  }
  return { tipDark, rootDark, samples };
});
console.log('齿顶中心 dark:', a.tipDark, '/72', a.tipDark >= 60 ? '✅ 齿形清晰' : '⚠');
console.log('齿谷中心 dark:', a.rootDark, '/72', a.rootDark <= 12 ? '✅ 谷底干净' : '⚠（谷底有填充）');
console.log('前4齿采样:', JSON.stringify(a.samples));
await browser.close();
