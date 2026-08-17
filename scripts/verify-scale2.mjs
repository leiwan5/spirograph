// dig into the color composition of pen-2 pixel changes in fixed mode
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
  const img1 = ctx.getImageData(0, 0, c.width, c.height).data;
  const slider = document.querySelectorAll('.pen-card')[0].querySelector('.pen-hole');
  slider.value = '150';
  slider.dispatchEvent(new Event('input'));
  await new Promise((r) => setTimeout(r, 500));
  const img2 = ctx.getImageData(0, 0, c.width, c.height).data;
  slider.value = '40';
  slider.dispatchEvent(new Event('input'));

  let pen2Total = 0, pen2Changed = 0, becameRed = 0, becameOther = 0;
  const otherColors = new Map();
  for (let i = 0; i < img1.length; i += 4) {
    const r = img1[i], g = img1[i + 1], b = img1[i + 2];
    const isPen2Blue = b > 120 && g > 80 && g < 150 && r < 80;
    if (!isPen2Blue) continue;
    pen2Total++;
    if (img2[i] === r && img2[i + 1] === g && img2[i + 2] === b) continue;
    pen2Changed++;
    const r2 = img2[i], g2 = img2[i + 1], b2 = img2[i + 2];
    const isRed = r2 > 180 && g2 < 120 && b2 < 120;
    if (isRed) {
      becameRed++;
    } else {
      becameOther++;
      const key = r2 + ',' + g2 + ',' + b2;
      otherColors.set(key, (otherColors.get(key) || 0) + 1);
    }
  }
  // incidentally confirm: sample-check pen-2's curve body (points far from pen 1)
  // take a region near the middle of pen-2's curve and check whether the blue is still in place - locate it via an image-diff region
  return {
    pen2Total,
    pen2Changed,
    becameRed,
    becameOther,
    otherTop: [...otherColors.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3),
  };
});
console.log(JSON.stringify(result, null, 1));
console.log('interpretation:', result.becameOther === 0
  ? '✅ all changed pixels became pen-1 red - pen-2 curve body did not move, it was merely covered by the enlarged pen 1'
  : '⚠ there are changes in colors other than pen-1, needs further analysis');
await browser.close();
