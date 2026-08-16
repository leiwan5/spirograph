// 干净验证：90° 方向（滚动齿轮不遮挡）采样环形齿轮的齿顶/齿谷
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
  const tipR = (72 - 0.5 * toothH) * scale;  // 394.1 齿顶（横线）
  const rootR = (72 - 1.5 * toothH) * scale; // 387.0 齿根（谷底）
  const step = Math.PI * 2 / 72;
  const px = (x, y) => {
    const i = (Math.round(y) * W + Math.round(x)) * 4;
    return [img[i], img[i + 1], img[i + 2]];
  };
  // 从角度 95° 开始（避开滚动齿轮遮挡区 ±48°），找 72 个齿
  let tipDark = 0, rootDark = 0;
  const base = (95 * Math.PI) / 180;
  for (let i = 0; i < 72; i++) {
    const at = base + (i + 0.5) * step; // 齿顶中心
    const ag = base + (i + 1.0) * step; // 齿谷中心
    const pTip = px(cx + tipR * Math.cos(at), cy + tipR * Math.sin(at));
    const pRoot = px(cx + rootR * Math.cos(ag), cy + rootR * Math.sin(ag));
    if (pTip[0] < 215) tipDark++;
    if (pRoot[0] < 215) rootDark++;
  }
  return { tipDark, rootDark };
});
console.log('齿顶中心深色(横线):', a.tipDark, '/72', a.tipDark >= 62 ? '✅ 72 齿平顶齿形正确' : '⚠');
console.log('齿谷中心深色(应少):', a.rootDark, '/72', a.rootDark <= 10 ? '✅ 谷底干净' : '⚠');
await browser.close();
