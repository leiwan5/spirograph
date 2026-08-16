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

const a = await page.evaluate(() => {
  const c = document.getElementById('canvas');
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;
  const img = ctx.getImageData(0, 0, W, H).data;
  const cx = W / 2, cy = H / 2;
  const scale = 5.52;
  const toothH = 7 / scale;
  const px = (x, y) => {
    const i = (Math.round(y) * W + Math.round(x)) * 4;
    return [img[i], img[i + 1], img[i + 2]];
  };
  // 齿顶圆半径（横线所在）：R - 0.5*toothH
  const tipR = (72 - 0.5 * toothH) * scale;
  // 采样：沿齿顶圆走，每 0.5px 一个点，统计深色段（齿顶横线）
  const N = 3600;
  let trans = 0;
  let prevDark = false;
  const darkRuns = [];
  for (let i = 0; i < N; i++) {
    const a2 = (i / N) * Math.PI * 2;
    const x = cx + tipR * Math.cos(a2);
    const y = cy + tipR * Math.sin(a2);
    const [r, g, b] = px(x, y);
    const dark = r < 225; // 描边 alpha0.55 混白 ≈186，填充 ≈238
    if (dark !== prevDark) { trans++; prevDark = dark; }
  }
  // 滚动齿轮盘面/孔圈
  const gcx = cx + (72 - 30) * scale, gcy = cy;
  const discR = 30 * scale;
  let holeCount = 0;
  for (let i = 0; i < 12; i++) {
    const a2 = (i / 12) * Math.PI * 2;
    const [r] = px(gcx + 0.75 * discR * Math.cos(a2), gcy + 0.75 * discR * Math.sin(a2));
    if (r < 200) holeCount++; // 孔描边处较暗
  }
  // 齿带整体淡色填充检查（环带中部 391px 处非纯白比例）
  let filled = 0;
  for (let i = 0; i < 720; i++) {
    const a2 = (i / 720) * Math.PI * 2;
    const [r] = px(cx + 391 * Math.cos(a2), cy + 391 * Math.sin(a2));
    if (r < 250) filled++;
  }
  return { tipR, transitions: trans, estimatedTeeth: trans / 2, holeCount, filledRatio: (filled / 720 * 100).toFixed(0) + '%' };
});
console.log('齿顶圆半径:', a.tipR.toFixed(1), 'px');
console.log('明暗交替:', a.transitions, '→ 估计齿数:', a.estimatedTeeth, a.estimatedTeeth > 64 && a.estimatedTeeth < 80 ? '✅ 72 齿正确' : '⚠ 偏差');
console.log('外孔圈 12 孔采样命中:', a.holeCount, '孔');
console.log('环带淡色填充占比:', a.filledRatio);
await browser.close();
