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
  // 孔半径（节圆）：0.035×30×5.52 = 5.8px；笔尖 = 5.8×0.72 = 4.2px
  // 中心：红色笔尖；4.2px 处：孔描边（深色）；7px 处：无白圈（应为背景/曲线色）
  const center = px(sx, sy);
  const tipEdge = px(sx - 4.2, sy);
  const holeEdge = px(sx - 5.8, sy);
  const beyond = px(sx - 7, sy); // 白圈位置（应无白色圈）
  // 找孔描边环的实际中心：沿 +x 方向扫描深色孔描边位置（应左右对称于 sx）
  let leftDark = null, rightDark = null;
  for (let dx = 2; dx < 10; dx++) {
    const pL = px(sx - dx, sy);
    const pR = px(sx + dx, sy);
    const dark = (p) => p[0] < 130 && p[1] < 150 && p[2] < 170;
    if (leftDark === null && dark(pL)) leftDark = dx;
    if (rightDark === null && dark(pR)) rightDark = dx;
  }
  return { center, tipEdge, holeEdge, beyond, leftDark, rightDark };
});
const isRed = (p) => p[0] > 180 && p[1] < 130 && p[2] < 130;
const isDark = (p) => p[0] < 130 && p[1] < 150 && p[2] < 170;
const isWhiteish = (p) => p[0] > 200 && p[1] > 200 && p[2] > 200;
console.log('孔中心(红色笔尖):', r.center.join(','), isRed(r.center) ? '✅' : '⚠');
console.log('笔尖边缘4.2px:', r.tipEdge.join(','), '孔描边5.8px:', r.holeEdge.join(','), isDark(r.holeEdge) ? '✅ 孔描边可见' : '⚠');
console.log('白圈位置7px:', r.beyond.join(','), !isWhiteish(r.beyond) ? '✅ 无白圈' : '⚠ 仍有白圈');
console.log('孔描边环: 左', r.leftDark, 'px | 右', r.rightDark, 'px', r.leftDark !== null && r.rightDark !== null && Math.abs(r.leftDark - r.rightDark) <= 1 ? '✅ 孔环与笔尖同心' : '⚠ 偏心');
console.log('JS错误:', errors.length ? errors : '无');
await browser.close();
