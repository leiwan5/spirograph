// 修复后验证：90° 方向径向扫描 + 齿顶/齿谷采样 + 动画
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
  // 90° 方向扫描 380-400
  const a90 = Math.PI / 2;
  const scan = [];
  for (let rad = 380; rad <= 400; rad += 2) {
    scan.push(rad + ':' + px(cx + rad * Math.cos(a90), cy + rad * Math.sin(a90)).join(','));
  }
  // 齿顶/齿谷采样（95° 起 72 齿）
  const scale = 5.52;
  const toothH = 7 / scale;
  const tipR = (72 - 0.5 * toothH) * scale;
  const rootR = (72 - 1.5 * toothH) * scale;
  const step = Math.PI * 2 / 72;
  const base = (95 * Math.PI) / 180;
  let tipDark = 0, rootDark = 0;
  for (let i = 0; i < 72; i++) {
    const at = base + (i + 0.5) * step;
    const ag = base + (i + 1.0) * step;
    const pTip = px(cx + tipR * Math.cos(at), cy + tipR * Math.sin(at));
    const pRoot = px(cx + rootR * Math.cos(ag), cy + rootR * Math.sin(ag));
    if (pTip[0] < 215) tipDark++;
    if (pRoot[0] < 215) rootDark++;
  }
  // 环内干净检查：半径 300 处（环内）应为白色
  const inside = px(cx, cy + 300);
  const insideClean = inside[0] === 255 && inside[1] === 255 && inside[2] === 255;
  return { scan, tipDark, rootDark, inside, insideClean };
});
console.log('90° 扫描:', r.scan.join(' | '));
console.log('齿顶深色:', r.tipDark, '/72 | 齿谷深色:', r.rootDark, '/72');
console.log('环内(300px)颜色:', r.inside.join(','), r.insideClean ? '✅ 环内干净（无填充漫入）' : '❌ 仍有填充');
// 动画回归
await page.click('#play');
await page.waitForTimeout(1200);
console.log('动画播放:', errors.length ? '❌ ' + errors.join(';') : '✅ 正常');
await page.click('#play');
await browser.close();
