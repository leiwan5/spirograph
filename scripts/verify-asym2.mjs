// Precise counts: how many "pen one red pixels" and "pen two blue pixels" move in each scenario
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

function setScaleMode(m) {
  return page.evaluate((mode) => {
    document.querySelector('#scale-seg button[data-scale="' + mode + '"]').click();
  }, m);
}
function setHole(penIdx, v) {
  return page.evaluate(([idx, val]) => {
    const slider = document.querySelectorAll('.pen-card')[idx].querySelector('.pen-hole');
    slider.value = String(val);
    slider.dispatchEvent(new Event('input'));
  }, [penIdx, v]);
}
async function capture() {
  return page.evaluate(() => {
    const c = document.getElementById('canvas');
    return Array.from(c.getContext('2d').getImageData(0, 0, c.width, c.height).data);
  });
}

// Pen one red #e63946 ≈ (230,57,70); pen two blue #1d6fa5 ≈ (29,111,165)
const isRed = (r, g, b) => r > 180 && g < 130 && b < 130 && r - g > 60;
const isBlue = (r, g, b) => b > 120 && g > 70 && g < 160 && r < 90;

async function measure(label, mode, change) {
  await setScaleMode(mode);
  await setHole(0, 39); await setHole(1, 79);
  await page.waitForTimeout(500);
  const before = await capture();
  await change();
  await page.waitForTimeout(500);
  const after = await capture();
  let redMoved = 0, blueMoved = 0;
  for (let i = 0; i < before.length; i += 4) {
    const r1 = before[i], g1 = before[i + 1], b1 = before[i + 2];
    const r2 = after[i], g2 = after[i + 1], b2 = after[i + 2];
    if (r1 === r2 && g1 === g2 && b1 === b2) continue;
    if (isRed(r1, g1, b1)) redMoved++;
    if (isBlue(r1, g1, b1)) blueMoved++;
  }
  console.log(label);
  console.log('  pen one (red) pixels moved:', redMoved, ' | pen two (blue) pixels moved:', blueMoved);
}

await measure('A [auto] change pen one 39->20 (watch whether pen two moves)', 'auto', () => setHole(0, 20));
await measure('B [auto] change pen two 79->40 (watch whether pen one moves)', 'auto', () => setHole(1, 40));
await measure('C [fixed] change pen two 79->40 (watch whether pen one moves)', 'fixed', () => setHole(1, 40));
await measure('D [fixed] change pen one 39->20 (watch whether pen two moves)', 'fixed', () => setHole(0, 20));

await browser.close();
