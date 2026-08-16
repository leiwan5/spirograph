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
// 笔一 40%（静态当前笔=0）：红线应到 0.4×30×5.52=66px
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
  // 滚动中心（t=0: 42 单位 x 方向）
  const gcx = cx + 42 * scale, gcy = cy;
  // 笔一孔：0.4×30×5.52 = 66px，局部角 0（t=0 时自转=meshPhase，但红线在局部坐标随 rotate 画）
  // 红线终点 = 滚动中心 + 66px（局部 x 轴，经 spin 旋转）→ t=0 spin=5.96°：方向 5.96°
  const spin = 5.96 * Math.PI / 180;
  const tipX = gcx + 66 * Math.cos(spin);
  const tipY = gcy + 66 * Math.sin(spin);
  // 沿红线方向从滚动中心采样到笔尖：应连续红色
  const trace = [];
  for (let d = 10; d <= 66; d += 8) {
    const x = gcx + d * Math.cos(spin);
    const y = gcy + d * Math.sin(spin);
    trace.push({ d, color: px(x, y).join(',') });
  }
  // 笔尖处像素（笔一孔中心，曲线起点）
  const curve = await import('/src/math/curve.ts');
  const data = curve.sampleCurve(72, 30, 'inside', 40);
  const tipPixel = px(data.points[0] * scale + cx, data.points[1] * scale + cy);
  return { trace, tipPixel };
});
console.log('沿红线采样（滚动中心 → 笔尖 66px）:');
for (const t of r.trace) console.log('  ' + t.d + 'px |', t.color);
const reddish = (p) => { const [rr, g, b] = p.split(',').map(Number); return rr > 140 && rr - b > 40; };
console.log('全部为红色:', r.trace.every((t) => reddish(t.color)) ? '✅ 红线连续到达笔尖' : '⚠ 中途消失');
console.log('笔尖处:', r.tipPixel.join(','), reddish(r.tipPixel) ? '(笔尖红)' : '');
console.log('JS错误:', errors.length ? errors : '无');
await browser.close();
