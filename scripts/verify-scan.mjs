// 沿半径方向扫描：从 360px 到 400px（齿带区域）逐像素输出颜色
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

const scan = await page.evaluate(() => {
  const c = document.getElementById('canvas');
  const ctx = c.getContext('2d');
  const W = c.width;
  const img = ctx.getImageData(0, 0, W, c.height).data;
  const cx = W / 2, cy = c.height / 2;
  const px = (x, y) => {
    const i = (Math.round(y) * W + Math.round(x)) * 4;
    return [img[i], img[i + 1], img[i + 2]];
  };
  // 沿 x 轴正方向（角度 0，齿形上可能在齿顶或齿谷）
  // 角度 0.5*step（齿顶中心）：从 380 到 400
  const step = Math.PI * 2 / 72;
  const out = [];
  for (const angle of [0.5 * step, 1.0 * step, 0.2 * step]) {
    const row = [];
    for (let rad = 380; rad <= 400; rad += 1) {
      const p = px(cx + rad * Math.cos(angle), cy + rad * Math.sin(angle));
      row.push(rad + ':' + p.join(','));
    }
    out.push({ angle: (angle / step).toFixed(1) + 'step', row });
  }
  return out;
});
for (const s of scan) {
  console.log('角度 ' + s.angle + ':');
  console.log('  ' + s.row.join(' | '));
}
await browser.close();
