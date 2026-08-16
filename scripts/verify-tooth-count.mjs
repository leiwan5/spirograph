// 齿形可见度统计 + 截图保存
import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
const EDGE = '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
const browser = await chromium.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto('http://localhost:5273/?ring=72&rolling=30&pen=40,e63946,2.5&pen=75,1d6fa5,2&scale=fixed&gears=1', { waitUntil: 'networkidle' });
await page.waitForTimeout(700);

// 环带区域（距中心 385-400px）深色像素（齿形描边）统计
const stats = await page.evaluate(() => {
  const c = document.getElementById('canvas');
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;
  const img = ctx.getImageData(0, 0, W, H).data;
  const cx = W / 2, cy = H / 2;
  const px = (x, y) => {
    const i = (Math.round(y) * W + Math.round(x)) * 4;
    return [img[i], img[i + 1], img[i + 2]];
  };
  let toothDark = 0, bandFilled = 0;
  // 只采样 60°-300°（避开滚动齿轮遮挡）
  for (let deg = 60; deg < 300; deg += 1) {
    const a = (deg * Math.PI) / 180;
    for (let rad = 386; rad <= 395; rad += 1) {
      const p = px(cx + rad * Math.cos(a), cy + rad * Math.sin(a));
      if (p[0] < 205) toothDark++;          // 齿形深色描边
      else if (p[0] < 250) bandFilled++;    // 环带淡色填充
    }
  }
  return { toothDark, bandFilled };
});
console.log('环带深色(齿形)像素:', stats.toothDark, '| 环带淡色填充像素:', stats.bandFilled,
  stats.toothDark > 3000 ? '✅ 齿形清晰可见' : '⚠ 齿形不明显');

const shot = await page.locator('#canvas').screenshot();
writeFileSync('scripts/shot-gears-fixed.png', shot);
console.log('截图已保存 scripts/shot-gears-fixed.png（可自行打开查看）');
await browser.close();
