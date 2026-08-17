// Decisive experiment: expected vs actual rendered red/blue pixel ranges
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

const r = await page.evaluate(async () => {
  // expected values: compute screen ranges under fixed for (72,30,'inside',39) and (72,30,'inside',75) using the page's latest modules
  const curve = await import('/src/math/curve.ts');
  const ren = await import('/src/render/renderer.ts');
  const store = await import('/src/state/store.ts');
  const c = document.getElementById('canvas');
  const rect = c.getBoundingClientRect();
  const W = Math.floor(rect.width), H = Math.floor(rect.height);
  const pad = Math.max(24, Math.min(W, H) * 0.04);
  const state = store.getState();
  const t = ren.computeTransform(ren.computeFixedBounds(state.ringTeeth, state.rollingTeeth, state.mode), W, H, pad);

  function boxOf(hole) {
    const data = curve.sampleCurve(state.ringTeeth, state.rollingTeeth, state.mode, hole);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < data.count; i++) {
      const [x, y] = ren.applyTransform(t, data.points[2 * i], data.points[2 * i + 1]);
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    return [Math.round(minX), Math.round(minY), Math.round(maxX), Math.round(maxY)];
  }

  // actual render: solid red / solid blue pixel box
  const img = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  const CW = c.width;
  function solidBox(pred) {
    let minX = CW, minY = c.height, maxX = 0, maxY = 0, n = 0;
    for (let y = 0; y < c.height; y++) {
      for (let x = 0; x < CW; x++) {
        const i = (y * CW + x) * 4;
        if (pred(img[i], img[i + 1], img[i + 2])) {
          n++;
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
      }
    }
    return { box: [minX, minY, maxX, maxY], n };
  }
  return {
    state: { mode: state.mode, ring: state.ringTeeth, rolling: state.rollingTeeth, pens: state.pens.map(p => p.hole), scaleMode: state.scaleMode },
    scale: t.scale,
    expectedPen1: boxOf(39),
    expectedPen2: boxOf(75),
    actualRed: solidBox((r, g, b) => r > 200 && g < 100 && b < 100),
    actualBlue: solidBox((r, g, b) => b > 130 && g > 90 && g < 135 && r < 60),
  };
});
console.log(JSON.stringify(r, null, 1));
await browser.close();
