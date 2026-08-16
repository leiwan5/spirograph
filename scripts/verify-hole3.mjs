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
  const center = px(sx, sy);
  // 孔描边环：半径 4.5 处（当前笔孔边）
  const ring = [px(sx - 4.5, sy), px(sx + 4.5, sy), px(sx, sy - 4.5), px(sx, sy + 4.5)];
  // 白圈：半径 6.5 处
  const white = [px(sx - 6.5, sy), px(sx + 6.5, sy), px(sx, sy - 6.5), px(sx, sy + 6.5)];
  return { center, ring, white };
});
const isRed = (p) => p[0] > 180 && p[1] < 130 && p[2] < 130;
const isDark = (p) => p[0] < 110 && p[1] < 130 && p[2] < 150 && p[0] > 30;
const isWhiteish = (p) => p[0] > 200 && p[1] > 200 && p[2] > 200;
console.log('孔中心(红色笔尖):', r.center.join(','), isRed(r.center) ? '✅' : '⚠');
console.log('孔描边环(深色空心圆边):', JSON.stringify(r.ring), r.ring.filter(isDark).length >= 2 ? '✅ 空心圆孔样式' : '⚠');
console.log('白圈(高亮):', JSON.stringify(r.white), r.white.filter(isWhiteish).length >= 2 ? '✅' : '⚠');
console.log('JS错误:', errors.length ? errors : '无');
await browser.close();
