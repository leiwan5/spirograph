// 定位"断开"：沿笔一曲线从远处走向孔中心，检测红色像素连续性
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

const r = await page.evaluate(async () => {
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
  const curve = await import('/src/math/curve.ts');
  const data = curve.sampleCurve(72, 30, 'inside', 40);
  // 从曲线第 500 点（远离起点）沿曲线往回走到起点（孔中心），检查每个点的像素
  const step = 10;
  const trace = [];
  for (let idx = 500; idx >= 0; idx -= step) {
    const x = data.points[2 * idx] * scale + cx;
    const y = data.points[2 * idx + 1] * scale + cy;
    const p = px(x, y);
    const distFromStart = Math.hypot(data.points[2 * idx] - data.points[0], data.points[2 * idx + 1] - data.points[1]) * scale;
    trace.push({ idx, dist: distFromStart.toFixed(1), color: p.join(',') });
  }
  return trace;
});
// 找"断点"：红色像素（曲线）消失的最远距离
const isRed = (p) => {
  const [r, g, b] = p.split(',').map(Number);
  return r > 150 && g < 130 && b < 130;
};
let lastRed = null, gap = null;
for (const t of r) {
  if (isRed(t.color)) lastRed = t;
  else if (lastRed && !gap) gap = t;
}
console.log('沿曲线走向孔中心（从 500 点开始）:');
for (const t of r.slice(0, 6)) console.log('  距起点', t.dist, 'px |', t.color);
console.log('...');
for (const t of r.slice(-6)) console.log('  距起点', t.dist, 'px |', t.color);
console.log('最后红色点距起点:', lastRed ? lastRed.dist + 'px' : '无', '| 第一个非红点:', gap ? gap.dist + 'px (' + gap.color + ')' : '无');
console.log('结论:', gap && parseFloat(gap.dist) > 2
  ? '曲线在距起点 ' + gap.dist + 'px 处消失（被覆盖区域半径）'
  : '曲线连续到孔中心');
await browser.close();
