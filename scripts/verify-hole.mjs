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
  // 笔一曲线起点（曲线坐标 → 屏幕）
  const curve = await import('/src/math/curve.ts');
  const data = curve.sampleCurve(72, 30, 'inside', 40);
  const scale = 5.52;
  const sx = data.points[0] * scale + cx;
  const sy = data.points[1] * scale + cy;
  // 起点处像素（应：深色孔底 + 红色笔尖居中）
  const p = px(sx, sy);
  const around = [
    px(sx - 3, sy), px(sx + 3, sy), px(sx, sy - 3), px(sx, sy + 3),
  ];
  // 曲线起点与滚动齿轮孔位（公式）一致性由单测保证，这里验证渲染
  return {
    startPixel: p,
    around,
    holeParam: 40,
    startRadius: Math.hypot(data.points[0], data.points[1]).toFixed(2),
    expectedHoleRadius: (0.4 * 30).toFixed(2),
  };
});
console.log('笔一曲线起点像素:', r.startPixel.join(','), '（深色孔底+红笔尖 ≈ 90,50,60 附近）');
console.log('起点周围(±3px):', JSON.stringify(r.around));
console.log('孔洞半径:', r.startRadius, '= 参数 40%×r =', r.expectedHoleRadius, r.startRadius === r.expectedHoleRadius ? '✅ 孔位=当前参数' : '⚠');
console.log('JS错误:', errors.length ? errors : '无');

// 动画：笔孔随动到曲线端点
await page.click('#play');
await page.waitForTimeout(1200);
const anim = await page.evaluate(async () => {
  const c = document.getElementById('canvas');
  const img = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  const W = c.width;
  const px = (x, y) => {
    const i = (Math.round(y) * W + Math.round(x)) * 4;
    return [img[i], img[i + 1], img[i + 2]];
  };
  // 动画进度 ~4%（速度1, 1.2s/15s），笔一内：曲线第 ~240 点
  const curve = await import('/src/math/curve.ts');
  const ren = await import('/src/render/renderer.ts');
  const data = curve.sampleCurve(72, 30, 'inside', 40);
  const idx = Math.floor(0.04 * data.count);
  const scale = 5.52;
  const ex = data.points[2 * idx] * scale + W / 2;
  const ey = data.points[2 * idx + 1] * scale + c.height / 2;
  return { endpointPixel: px(ex, ey), endpointRadius: Math.hypot(data.points[2 * idx], data.points[2 * idx + 1]).toFixed(2) };
});
console.log('动画中曲线端点像素:', anim.endpointPixel.join(','), '（应含深色孔底+红笔尖）');
await page.click('#play');
await browser.close();
