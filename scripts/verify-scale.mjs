// Validate: in fixed mode, adjusting pen-1's hole no longer scales pen 2 along with it
import { chromium } from 'playwright-core';

const EDGE = '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
const browser = await chromium.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
await page.goto('http://localhost:5273/', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);

// capture the whole canvas and return diff-pixel stats
async function capture() {
  return page.evaluate(() => {
    const c = document.getElementById('canvas');
    const ctx = c.getContext('2d');
    return Array.from(ctx.getImageData(0, 0, c.width, c.height).data);
  });
}
function diffPixels(a, b) {
  let n = 0;
  for (let i = 0; i < a.length; i += 4) {
    if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) n++;
  }
  return n;
}

// pen-1 hole from 40 -> 150
async function setPen1Hole(v) {
  await page.evaluate((val) => {
    const slider = document.querySelectorAll('.pen-card')[0].querySelector('.pen-hole');
    slider.value = String(val);
    slider.dispatchEvent(new Event('input'));
  }, v);
  await page.waitForTimeout(500);
}

async function run(mode) {
  // switch scale mode
  await page.evaluate((m) => {
    const b = document.querySelector('#scale-seg button[data-scale="' + m + '"]');
    b.click();
  }, mode);
  await page.waitForTimeout(400);
  const before = await capture();
  await setPen1Hole(150);
  const after = await capture();
  await setPen1Hole(40); // reset
  return diffPixels(before, after);
}

const diffAuto = await run('auto');
const diffFixed = await run('fixed');
console.log('auto mode  diff pixels:', diffAuto);
console.log('fixed mode diff pixels:', diffFixed);
console.log('conclusion:', diffFixed < diffAuto * 0.5
  ? '✅ in fixed mode pen 2 is no longer scaled along with pen 1 (the diff comes only from pen-1 own curve change)'
  : '⚠ diff ratio insufficient, needs checking');

// in fixed mode, are pen-2's curve pixels completely static? compare the region excluding pen 1
// stricter: in fixed mode, the "pixels pen-2's curve passes through" must be 100% identical before/after changing the hole
const strict = await page.evaluate(async () => {
  const c = document.getElementById('canvas');
  const ctx = c.getContext('2d');
  const img1 = ctx.getImageData(0, 0, c.width, c.height).data;
  // change pen-1's hole
  const slider = document.querySelectorAll('.pen-card')[0].querySelector('.pen-hole');
  slider.value = '150';
  slider.dispatchEvent(new Event('input'));
  await new Promise((r) => setTimeout(r, 500));
  const img2 = ctx.getImageData(0, 0, c.width, c.height).data;
  slider.value = '40';
  slider.dispatchEvent(new Event('input'));
  // find pixels that were "non-background and not pen-1 red" before (i.e. pen-2's blue pixels), and check whether they stay in place after
  let pen2Pixels = 0, pen2Changed = 0;
  for (let i = 0; i < img1.length; i += 4) {
    const r = img1[i], g = img1[i + 1], b = img1[i + 2];
    const isPen2Blue = b > 120 && g > 80 && g < 150 && r < 80; // #1d6fa5 ≈ (29,111,165)
    if (isPen2Blue) {
      pen2Pixels++;
      if (img2[i] !== r || img2[i + 1] !== g || img2[i + 2] !== b) pen2Changed++;
    }
  }
  return { pen2Pixels, pen2Changed };
});
console.log('fixed-mode pen-2 blue pixels:', strict.pen2Pixels, '| changed:', strict.pen2Changed,
  strict.pen2Pixels > 500 && strict.pen2Changed === 0 ? '✅ pen-2 pixels perfectly still' : '⚠ changed');
console.log('ERRORS:', errors.length ? errors : 'none');
await browser.close();
