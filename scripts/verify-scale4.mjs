// Inspect the exact location and neighborhood of "pen 2 blue pixel changes" in fixed mode
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
await page.evaluate(() => {
  document.querySelector('#scale-seg button[data-scale="fixed"]').click();
});
await page.waitForTimeout(400);

const result = await page.evaluate(async () => {
  const c = document.getElementById('canvas');
  const ctx = c.getContext('2d');
  const W = c.width;
  const img1 = ctx.getImageData(0, 0, W, c.height).data;
  const slider = document.querySelectorAll('.pen-card')[0].querySelector('.pen-hole');
  slider.value = '150';
  slider.dispatchEvent(new Event('input'));
  await new Promise((r) => setTimeout(r, 500));
  const img2 = ctx.getImageData(0, 0, W, c.height).data;
  slider.value = '40';
  slider.dispatchEvent(new Event('input'));

  function at(img, x, y) {
    const i = (y * W + x) * 4;
    return [img[i], img[i + 1], img[i + 2]];
  }
  const out = [];
  for (let y = 0; y < c.height && out.length < 6; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const r = img1[i], g = img1[i + 1], b = img1[i + 2];
      const isPen2Blue = b > 120 && g > 80 && g < 150 && r < 80;
      if (!isPen2Blue) continue;
      if (img2[i] !== r || img2[i + 1] !== g || img2[i + 2] !== b) {
        const nb = [];
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            nb.push(at(img2, x + dx, y + dy));
          }
        }
        out.push({
          x, y,
          before: [r, g, b],
          after: at(img2, x, y),
          // whether pen 1 red appears within the 3×3 neighborhood
          neighborRed: nb.some((p) => p[0] > 180 && p[1] < 120 && p[2] < 120),
        });
      }
    }
  }
  return out;
});
console.log(JSON.stringify(result, null, 1));
await browser.close();
