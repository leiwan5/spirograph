import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
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
  const px = (x, y) => {
    const i = (Math.round(y) * W + Math.round(x)) * 4;
    return [img[i], img[i + 1], img[i + 2]];
  };
  // 环带区（386-395px，60°-300° 避开滚动齿轮）齿形深色像素
  let toothDark = 0, bandFilled = 0;
  for (let deg = 60; deg < 300; deg += 1) {
    const a = (deg * Math.PI) / 180;
    for (let rad = 386; rad <= 395; rad += 1) {
      const p = px(cx + rad * Math.cos(a), cy + rad * Math.sin(a));
      if (p[0] < 215) toothDark++;
      else if (p[0] < 250) bandFilled++;
    }
  }
  // 环内干净（300px 半径）
  const inside = px(cx, cy + 300);
  // 齿形结构：95° 起 72 齿顶/齿谷
  const scale = 5.52, toothH = 7 / scale;
  const tipR = (72 - 0.5 * toothH) * scale;
  const rootR = (72 - 1.5 * toothH) * scale;
  const step = Math.PI * 2 / 72;
  const base = (95 * Math.PI) / 180;
  let tipDark = 0, rootDark = 0;
  for (let i = 0; i < 72; i++) {
    const at = base + (i + 0.5) * step;
    const ag = base + (i + 1.0) * step;
    if (px(cx + tipR * Math.cos(at), cy + tipR * Math.sin(at))[0] < 215) tipDark++;
    if (px(cx + rootR * Math.cos(ag), cy + rootR * Math.sin(ag))[0] < 215) rootDark++;
  }
  return { toothDark, bandFilled, inside, tipDark, rootDark };
});
console.log('齿形深色像素:', r.toothDark, r.toothDark > 8000 ? '✅ 齿形清晰' : '⚠');
console.log('环带淡色填充:', r.bandFilled);
console.log('环内颜色:', r.inside.join(','), r.inside[0] === 255 ? '✅ 干净' : '⚠');
console.log('齿顶:', r.tipDark, '/72 | 齿谷:', r.rootDark, '/72');

await page.click('#play');
await page.waitForTimeout(1500);
console.log('动画:', errors.length ? '❌' : '✅ 正常');
await page.click('#play');
const shot = await page.locator('#canvas').screenshot();
writeFileSync('scripts/shot-gears-final.png', shot);
console.log('截图: scripts/shot-gears-final.png');
await browser.close();
