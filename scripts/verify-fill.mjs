// 分步实验：离屏 canvas 手动绘制齿形，定位 fill 越界问题
import { chromium } from 'playwright-core';
const EDGE = '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
const browser = await chromium.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto('http://localhost:5273/', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);

const exp = await page.evaluate(() => {
  const canvas = document.createElement('canvas');
  canvas.width = 600; canvas.height = 600;
  const ctx = canvas.getContext('2d');
  const cx = 300, cy = 300;
  const scale = 5.52;
  const toothH = 7 / scale;
  const ringRoot = (72 - toothH * 1.5) * scale;
  const ringTip = (72 - toothH * 0.5) * scale;
  const PI2 = Math.PI * 2;
  const ringStep = PI2 / 72;

  // 实验 A：只 fill 锯齿多边形
  ctx.beginPath();
  for (let i = 0; i < 72; i++) {
    const a = i * ringStep;
    const x0 = cx + ringRoot * Math.cos(a + ringStep * 0.2);
    const y0 = cy + ringRoot * Math.sin(a + ringStep * 0.2);
    const x1 = cx + ringTip * Math.cos(a + ringStep * 0.35);
    const y1 = cy + ringTip * Math.sin(a + ringStep * 0.35);
    const x2 = cx + ringTip * Math.cos(a + ringStep * 0.62);
    const y2 = cy + ringTip * Math.sin(a + ringStep * 0.62);
    if (i === 0) ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x2, y2);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(150,162,182,1)'; // 实色便于观察
  ctx.fill();

  const img = ctx.getImageData(0, 0, 600, 600).data;
  const px = (x, y) => {
    const i = (Math.round(y) * 600 + Math.round(x)) * 4;
    return [img[i], img[i + 1], img[i + 2]];
  };
  // 90° 方向扫描
  const scan = [];
  for (let rad = 270; rad <= 310; rad += 5) {
    const p = px(cx, cy + rad);
    scan.push(rad + ':' + p.join(','));
  }
  return { ringRoot: ringRoot.toFixed(1), ringTip: ringTip.toFixed(1), scan };
});
console.log('ringRoot:', exp.ringRoot, '| ringTip:', exp.ringTip);
console.log('90°方向 fill 扫描:', exp.scan.join(' | '));
await browser.close();
