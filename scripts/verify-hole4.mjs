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
  // 笔一曲线起点（= 笔一孔位）
  const curve = await import('/src/math/curve.ts');
  const ren = await import('/src/render/renderer.ts');
  const data = curve.sampleCurve(72, 30, 'inside', 40);
  const scale = 5.52;
  const sx = data.points[0] * scale + cx;
  const sy = data.points[1] * scale + cy;
  // 滚动齿轮中心（t=0：42 单位 x 方向）
  const gcx = cx + 42 * scale, gcy = cy;
  // 笔一孔在盘面局部：frac=0.4，angle=0 → 距滚动中心 = 0.4×30×scale
  // 孔阵中 0.4 圈的存在性：由单测保证；这里验证笔尖画在孔中心
  const center = px(sx, sy); // 应红色笔尖
  const holeRing = px(sx - 3.5, sy); // 孔描边附近（空心圆边 3.5px）
  // 孔阵整体：盘面上应有多个空心圆孔（在 0.4/0.75 圈及补充圈）
  // 数盘面（滚动中心 160px 半径内）的孔描边像素：找"圆环"难，改验证孔阵函数输出
  const pattern = ren.generateHolePattern([{ hole: 40 }, { hole: 75 }]);
  const fracs = [...new Set(pattern.map((h) => h.frac))].sort((a, b) => a - b);
  return { center, holeRing, fracs, totalHoles: pattern.length };
});
const isRed = (p) => p[0] > 180 && p[1] < 130 && p[2] < 130;
const isDark = (p) => p[0] < 110 && p[1] < 130 && p[2] < 150 && p[0] > 30;
console.log('笔尖像素:', r.center.join(','), isRed(r.center) ? '✅ 笔尖在孔中心' : '⚠');
console.log('孔边3.5px处:', r.holeRing.join(','), isDark(r.holeRing) ? '✅ 孔描边（空心圆）' : '⚠ 需检查');
console.log('孔阵半径档位:', JSON.stringify(r.fracs.map(f => (f * 100).toFixed(0) + '%')));
console.log('孔总数:', r.totalHoles, r.fracs.includes(0.4) && r.fracs.includes(0.75) ? '✅ 含笔参数圈(40%/75%)' : '⚠');
console.log('JS错误:', errors.length ? errors : '无');
await browser.close();
