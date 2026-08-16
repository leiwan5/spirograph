// 像素级验证齿轮外观：齿数交替、盘面填充、孔圈
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

const analysis = await page.evaluate(() => {
  const c = document.getElementById('canvas');
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;
  const img = ctx.getImageData(0, 0, W, H).data;
  const cx = W / 2, cy = H / 2;
  function px(x, y) {
    const i = (Math.round(y) * W + Math.round(x)) * 4;
    return [img[i], img[i + 1], img[i + 2]];
  }
  // 环齿带半径：R=72, scale=(864-69.12)/144=5.52 → 齿带 388..394px，采 391
  const ringBandR = (72 - 6 / 5.52) * 5.52;
  // 沿环一周采样，统计"非白色像素"的交替次数（齿 vs 谷）
  const N = 3600;
  let trans = 0;
  let prevDark = false;
  const darkCount = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const x = cx + ringBandR * Math.cos(a);
    const y = cy + ringBandR * Math.sin(a);
    const [r, g, b] = px(x, y);
    const isBg = r > 250 && g > 250 && b > 250;
    const dark = !isBg && r < 210; // 齿轮廓（灰蓝 ~118-150）
    if (dark !== prevDark) { trans++; prevDark = dark; }
  }
  // 滚动齿轮：中心 (R-r)*scale = 232px → (689,432)，盘面中心、孔圈采样
  const gcx = cx + (72 - 30) * 5.52, gcy = cy;
  const discR = 30 * 5.52;
  const centerColor = px(gcx, gcy);
  // 孔圈 0.5r 处 8 个孔：检查孔位置 vs 非孔位置的颜色差异
  const holeR = 0.5 * discR;
  const holeColors = [];
  const solidColors = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    holeColors.push(px(gcx + holeR * Math.cos(a), gcy + holeR * Math.sin(a)));
    solidColors.push(px(gcx + (holeR + 0.1 * discR) * Math.cos(a), gcy + (holeR + 0.1 * discR) * Math.sin(a)));
  }
  const avg = (arr) => arr.reduce((s, p) => s + p[2], 0) / arr.length;
  return {
    ringBandR,
    toothTransitions: trans, // 应 ≈ 72*2 = 144（72 齿 × 明暗边界 ×2）
    estimatedTeeth: trans / 2,
    rollingCenter: centerColor,
    holeAvgBlue: avg(holeColors).toFixed(0),
    solidAvgBlue: avg(solidColors).toFixed(0),
    discR,
  };
});
console.log('环齿带半径:', analysis.ringBandR.toFixed(1), 'px');
console.log('沿环明暗交替次数:', analysis.toothTransitions, '→ 估计齿数:', analysis.estimatedTeeth, analysis.estimatedTeeth > 60 && analysis.estimatedTeeth < 84 ? '✅ 齿形正确（72 齿）' : '⚠');
console.log('滚动齿轮中心颜色:', analysis.rollingCenter.join(','), '(应有淡色填充，非纯白)');
console.log('孔圈处平均蓝 vs 盘面平均蓝:', analysis.holeAvgBlue, 'vs', analysis.solidAvgBlue, analysis.holeAvgBlue < analysis.solidAvgBlue ? '✅ 孔圈可见（孔较暗）' : '⚠');
await browser.close();
