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
  const scale = 5.52;
  const px = (x, y) => {
    const i = (Math.round(y) * W + Math.round(x)) * 4;
    return [img[i], img[i + 1], img[i + 2]];
  };
  // 沿 x 正方向（滚动齿轮中心方向）扫描半径 380-410
  const scan = [];
  for (let rad = 380; rad <= 410; rad += 2) {
    scan.push(rad + ':' + px(cx + rad, cy).join(','));
  }
  // 深色（齿形描边）最大半径：滚动齿尖应 ≤ (72+0.2h)*scale ≈ 399.2
  // 环谷底 = (72+0.3h)*scale ≈ 399.8，环外缘 = (72+1.2h)*scale ≈ 404.6
  let deepest = 0;
  for (let rad = 380; rad <= 410; rad += 1) {
    const p = px(cx + rad, cy);
    if (p[0] < 210) deepest = rad;
  }
  return { scan, deepest };
});
console.log('x+ 方向扫描（380-410）:');
console.log(r.scan.join(' | '));
console.log('最远深色像素半径:', r.deepest, 'px');
console.log('期望: 滚动齿尖 ≈399.2 | 环谷底 ≈399.8 | 环外缘 ≈404.6');
console.log('判定:', r.deepest <= 401 ? '✅ 滚动齿未超出环谷底/外缘' : '⚠ 仍有超出');
console.log('JS错误:', errors.length ? errors : '无');
await browser.close();
