// control experiment: redraw with no parameter change vs changing pen-1's hole
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
  const W = c.width, H = c.height;

  function grab() {
    return ctx.getImageData(0, 0, W, H).data;
  }
  function diffStats(a, b) {
    let n = 0, minX = W, minY = H, maxX = 0, maxY = 0;
    for (let i = 0; i < a.length; i += 4) {
      if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) {
        n++;
        const px = (i / 4) % W, py = Math.floor(i / 4 / W);
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
      }
    }
    return { n, box: n ? [minX, minY, maxX, maxY] : null };
  }

  // Experiment 1: no parameter change, trigger a no-op redraw (dispatch the same value)
  const imgA = grab();
  const slider = document.querySelectorAll('.pen-card')[0].querySelector('.pen-hole');
  slider.value = '40';
  slider.dispatchEvent(new Event('input')); // value unchanged, but still triggers setState+redraw
  await new Promise((r) => setTimeout(r, 500));
  const imgB = grab();
  const base = diffStats(imgA, imgB);

  // Experiment 2: change pen-1 hole 40 -> 150
  const imgC = grab();
  slider.value = '150';
  slider.dispatchEvent(new Event('input'));
  await new Promise((r) => setTimeout(r, 500));
  const imgD = grab();
  const changed = diffStats(imgC, imgD);

  // Experiment 3: change back to 40, compare with imgA (should fully restore = deterministic)
  slider.value = '40';
  slider.dispatchEvent(new Event('input'));
  await new Promise((r) => setTimeout(r, 500));
  const imgE = grab();
  const restored = diffStats(imgA, imgE);

  // Experiment 4: sample colors of Experiment 2's diff pixels (take the first 5)
  const samples = [];
  for (let i = 0; i < imgC.length && samples.length < 5; i += 4) {
    if (imgC[i] !== imgD[i] || imgC[i + 1] !== imgD[i + 1] || imgC[i + 2] !== imgD[i + 2]) {
      const px = (i / 4) % W, py = Math.floor(i / 4 / W);
      samples.push({ x: px, y: py, before: [imgC[i], imgC[i + 1], imgC[i + 2]], after: [imgD[i], imgD[i + 1], imgD[i + 2]] });
    }
  }
  return { base, changed, restored, samples };
});
console.log(JSON.stringify(result, null, 1));
await browser.close();
