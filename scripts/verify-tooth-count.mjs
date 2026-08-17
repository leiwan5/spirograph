// tooth visibility stats + screenshot save
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

// count dark pixels (tooth outlines) in the ring band (385-400px from center)
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
  // only sample 60°-300° (avoiding the rolling gear obstruction)
  for (let deg = 60; deg < 300; deg += 1) {
    const a = (deg * Math.PI) / 180;
    for (let rad = 386; rad <= 395; rad += 1) {
      const p = px(cx + rad * Math.cos(a), cy + rad * Math.sin(a));
      if (p[0] < 205) toothDark++;          // tooth dark outline
      else if (p[0] < 250) bandFilled++;    // ring band light fill
    }
  }
  return { toothDark, bandFilled };
});
console.log('ring band dark (tooth) pixels:', stats.toothDark, '| ring band light fill pixels:', stats.bandFilled,
  stats.toothDark > 3000 ? '✅ teeth clearly visible' : '⚠ teeth not visible');

const shot = await page.locator('#canvas').screenshot();
writeFileSync('scripts/shot-gears-fixed.png', shot);
console.log('screenshot saved to scripts/shot-gears-fixed.png (open it to view)');
await browser.close();
