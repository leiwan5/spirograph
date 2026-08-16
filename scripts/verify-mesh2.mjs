// 沿滚动齿尖方向（5°，含啮合相位 -1° + 局部 6°）扫描
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
  // 齿尖方向 5°（= meshPhase -1° + 0.5·stepRoll 6°），齿谷方向 11°
  const rows = [];
  for (const deg of [5, 11]) {
    const a = (deg * Math.PI) / 180;
    const row = [];
    for (let rad = 388; rad <= 408; rad += 2) {
      const p = px(cx + rad * Math.cos(a), cy + rad * Math.sin(a));
      row.push(rad + ':' + p.join(','));
    }
    rows.push({ deg, row });
  }
  // 深色像素最大半径（齿形描边，排除环外缘 404.9±2）
  let deepest = 0;
  const a5 = (5 * Math.PI) / 180;
  for (let rad = 388; rad <= 403; rad += 1) {
    const p = px(cx + rad * Math.cos(a5), cy + rad * Math.sin(a5));
    if (p[0] < 215) deepest = rad;
  }
  return { rows, deepest };
});
for (const row of r.rows) {
  console.log(row.deg + '°: ' + row.row.join(' | '));
}
console.log('5°方向 388-403px 最远齿形深色:', r.deepest, 'px（理论滚动齿尖≈398.5，环谷底≈399.8）');
console.log('判定:', r.deepest <= 399 ? '✅ 滚动齿尖在环谷底内（不超出）' : '⚠ 仍有超出');
await browser.close();
