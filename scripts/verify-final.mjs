// Final verification of the user's core scenarios (after the fix):
// A) Ring fixed + 72/30 + 39/79: change pen one -> pen two does not move at all
// B) Ring fixed + 72/30 + 39/79: change pen two -> pen one's position does not move (can only be covered by pen two)
// C) Ring pixels constant: under 72+30 and 96+63, the hole=100 curve clings to the ring's inner edge (radius = theoretical value)
import { chromium } from 'playwright-core';

const EDGE = '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
const browser = await chromium.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto('http://localhost:5273/', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

await page.evaluate(() => {
  document.querySelector('#scale-seg button[data-scale="fixed"]').click();
});
const setHole = (idx, v) => page.evaluate(([i, val]) => {
  const s = document.querySelectorAll('.pen-card')[i].querySelector('.pen-hole');
  s.value = String(val);
  s.dispatchEvent(new Event('input'));
}, [idx, v]);

async function grab() {
  return page.evaluate(() => {
    const c = document.getElementById('canvas');
    return Array.from(c.getContext('2d').getImageData(0, 0, c.width, c.height).data);
  });
}
const pureRed = (r, g, b) => r > 200 && g < 100 && b < 100;
const pureBlue = (r, g, b) => b > 130 && g > 90 && g < 135 && r < 60;

async function measure(label, change) {
  const before = await grab();
  await change();
  await page.waitForTimeout(400);
  const after = await grab();
  let redMoved = 0, blueMoved = 0, redToBlue = 0;
  for (let i = 0; i < before.length; i += 4) {
    const r1 = before[i], g1 = before[i + 1], b1 = before[i + 2];
    const r2 = after[i], g2 = after[i + 1], b2 = after[i + 2];
    if (r1 === r2 && g1 === g2 && b1 === b2) continue;
    if (pureRed(r1, g1, b1)) {
      redMoved++;
      if (pureBlue(r2, g2, b2)) redToBlue++;
    }
    if (pureBlue(r1, g1, b1)) blueMoved++;
  }
  console.log(label, '-> pen one (red) moved:', redMoved, '| pen two (blue) moved:', blueMoved, '| red->blue (covered):', redToBlue);
  return { redMoved, blueMoved };
}

await setHole(0, 39); await setHole(1, 79);
await page.waitForTimeout(500);

// A: change pen one 39->20
let a = await measure('A change pen one 39->20', () => setHole(0, 20));
// B: change pen two 79->40 (reset pen one)
let b = await measure('B change pen two 79->40', async () => { await setHole(0, 39); await setHole(1, 40); });

// C: ring pixels constant (re-verify with the correct mode)
const ring = await page.evaluate(async () => {
  const curve = await import('/src/math/curve.ts');
  const ren = await import('/src/render/renderer.ts');
  const c = document.getElementById('canvas');
  const rect = c.getBoundingClientRect();
  const W = Math.floor(rect.width), H = Math.floor(rect.height);
  const pad = Math.max(24, Math.min(W, H) * 0.04);
  function maxR(R, r) {
    const d = curve.sampleCurve(R, r, 'inside', 100);
    const t = ren.computeTransform(ren.computeFixedBounds(R, r, 'inside'), W, H, pad);
    let m = 0;
    for (let i = 0; i < d.count; i += 7) {
      const [x, y] = ren.applyTransform(t, d.points[2 * i], d.points[2 * i + 1]);
      m = Math.max(m, Math.hypot(x - W / 2, y - H / 2));
    }
    return m;
  }
  return { r72: maxR(72, 30), r96: maxR(96, 63), expected: (Math.min(W, H) - 2 * pad) / 2 };
});

console.log('C ring radius: 72+30 =', ring.r72.toFixed(1), '| 96+63 =', ring.r96.toFixed(1), '| theoretical =', ring.expected.toFixed(1),
  Math.abs(ring.r72 - ring.r96) < 1 && Math.abs(ring.r72 - ring.expected) < 3 ? '✅ ring constant' : '⚠ anomaly');

// Conclusion verdict
console.log('A verdict:', a.blueMoved === 0 ? '✅ changed pen one, pen two did not move at all' : '⚠ pen two moved');
console.log('B verdict:', b.redToBlue === b.redMoved
  ? '✅ all pen one changes come from "covered by the new pen two curve" (position did not move)'
  : (b.redMoved === 0 ? '✅ pen one did not move at all' : '⚠ pen one has non-cover changes ' + (b.redMoved - b.redToBlue)));
await browser.close();
