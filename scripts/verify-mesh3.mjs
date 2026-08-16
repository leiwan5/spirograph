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

const r = await page.evaluate(() => {
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
  // 用最新 meshPhase 计算齿尖绝对位置
  // （页面里无法直接 import 纯函数？可以）
  return 'placeholder';
});

// 改用页面动态 import 计算期望齿尖位置
const r2 = await page.evaluate(async () => {
  const gear = await import('/src/math/gear.ts');
  const phase = gear.meshPhase(72, 30);
  const stepRoll = (Math.PI * 2) / 30;
  const stepRing = (Math.PI * 2) / 72;
  const theta = phase + 0.5 * stepRoll; // 齿尖相对滚动中心方向
  const tipX = (72 - 30) + 30.2 * Math.cos(theta); // 齿尖绝对位置（曲线坐标）
  const tipY = 30.2 * Math.sin(theta);
  const tipAngle = Math.atan2(tipY, tipX);
  const nearestValley = Math.round(tipAngle / stepRing) * stepRing;

  // 像素采样：齿尖位置（应深色——滚动齿描边）
  const c = document.getElementById('canvas');
  const ctx = c.getContext('2d');
  const W = c.width;
  const img = ctx.getImageData(0, 0, W, c.height).data;
  const cx = W / 2, cy = c.height / 2;
  const scale = 5.52;
  const px = (x, y) => {
    const i = (Math.round(y) * W + Math.round(x)) * 4;
    return [img[i], img[i + 1], img[i + 2]];
  };
  const tipScreen = [cx + tipX * scale, cy + tipY * scale];
  const tipPixel = px(tipScreen[0], tipScreen[1]);
  // 环谷底圆上同方向采样（应环带填充或白）
  const valleyR = (72 + 0.3 * (7 / scale)) * scale;
  const valleyScreen = [cx + valleyR * Math.cos(tipAngle), cy + valleyR * Math.sin(tipAngle)];
  const valleyPixel = px(valleyScreen[0], valleyScreen[1]);
  // 环齿谷中心方向（valley 角）处：滚动齿尖应在此方向（深色）且不超谷底
  return {
    phaseDeg: (phase * 180 / Math.PI).toFixed(2),
    tipAngleDeg: (tipAngle * 180 / Math.PI).toFixed(2),
    nearestValleyDeg: (nearestValley * 180 / Math.PI).toFixed(2),
    tipPixel,
    valleyPixel,
    tipR: Math.hypot(tipX, tipY).toFixed(2),
    valleyR: (72 + 0.3 * 1.268).toFixed(2),
  };
});
console.log('啮合相位:', r2.phaseDeg + '°');
console.log('齿尖极角:', r2.tipAngleDeg + '°', '| 最近谷中心:', r2.nearestValleyDeg + '°', Math.abs(parseFloat(r2.tipAngleDeg) - parseFloat(r2.nearestValleyDeg)) < 0.5 ? '✅ 对齐' : '⚠');
console.log('齿尖处像素:', r2.tipPixel.join(','), r2.tipPixel[0] < 215 ? '✅ 滚动齿在此' : '⚠ 无齿');
console.log('环谷底处像素:', r2.valleyPixel.join(','), r2.valleyPixel[0] > 235 ? '✅ 齿尖未达谷底(留隙)' : '⚠');
console.log('齿尖半径:', r2.tipR, '< 谷底:', r2.valleyR, parseFloat(r2.tipR) < parseFloat(r2.valleyR) ? '✅ 不超出' : '⚠');
console.log('JS错误:', errors.length ? errors : '无');
await browser.close();
