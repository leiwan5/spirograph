import { chromium } from 'playwright-core';
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
  const scale = 5.52;
  const px = (x, y) => {
    const i = (Math.round(y) * W + Math.round(x)) * 4;
    return [img[i], img[i + 1], img[i + 2]];
  };
  // compute the absolute tooth-tip position with the latest meshPhase
  // (can't import a pure function from inside the page? you can)
  return 'placeholder';
});

// switch to computing the expected tooth-tip position via dynamic import in the page
const r2 = await page.evaluate(async () => {
  const gear = await import('/src/math/gear.ts');
  const phase = gear.meshPhase(72, 30);
  const stepRoll = (Math.PI * 2) / 30;
  const stepRing = (Math.PI * 2) / 72;
  const theta = phase + 0.5 * stepRoll; // tooth-tip direction relative to the rolling center
  const tipX = (72 - 30) + 30.2 * Math.cos(theta); // absolute tooth-tip position (curve coords)
  const tipY = 30.2 * Math.sin(theta);
  const tipAngle = Math.atan2(tipY, tipX);
  const nearestValley = Math.round(tipAngle / stepRing) * stepRing;

  // pixel sampling: tooth-tip position (should be dark - rolling tooth stroke)
  const c = document.getElementById('canvas');
  const ctx = c.getContext('2d');
  const W = c.width;
  const img = ctx.getImageData(0, 0, W, c.height).data;
  const cx = W / 2, cy = c.height / 2;
  const scale = 5.52;
  const px = (x, y) => {
    const i = (Math.round(y) * W + Math.round(x)) * 4;
    return [img[i], img[i + 1], img[i + 2]];
  };
  const tipScreen = [cx + tipX * scale, cy + tipY * scale];
  const tipPixel = px(tipScreen[0], tipScreen[1]);
  // sample the same direction on the ring-valley-bottom circle (should be ring fill or white)
  const valleyR = (72 + 0.3 * (7 / scale)) * scale;
  const valleyScreen = [cx + valleyR * Math.cos(tipAngle), cy + valleyR * Math.sin(tipAngle)];
  const valleyPixel = px(valleyScreen[0], valleyScreen[1]);
  // at the ring tooth-valley center direction (valley angle): the rolling tooth tip should lie on this direction (dark) and stay within the valley bottom
  return {
    phaseDeg: (phase * 180 / Math.PI).toFixed(2),
    tipAngleDeg: (tipAngle * 180 / Math.PI).toFixed(2),
    nearestValleyDeg: (nearestValley * 180 / Math.PI).toFixed(2),
    tipPixel,
    valleyPixel,
    tipR: Math.hypot(tipX, tipY).toFixed(2),
    valleyR: (72 + 0.3 * 1.268).toFixed(2),
  };
});
console.log('meshing phase:', r2.phaseDeg + '°');
console.log('tooth-tip polar angle:', r2.tipAngleDeg + '°', '| nearest valley center:', r2.nearestValleyDeg + '°', Math.abs(parseFloat(r2.tipAngleDeg) - parseFloat(r2.nearestValleyDeg)) < 0.5 ? '✅ aligned' : '⚠');
console.log('pixel at tooth tip:', r2.tipPixel.join(','), r2.tipPixel[0] < 215 ? '✅ rolling tooth here' : '⚠ no tooth');
console.log('pixel at ring valley bottom:', r2.valleyPixel.join(','), r2.valleyPixel[0] > 235 ? '✅ tooth tip does not reach the valley bottom (clearance)' : '⚠');
console.log('tooth-tip radius:', r2.tipR, '< valley bottom:', r2.valleyR, parseFloat(r2.tipR) < parseFloat(r2.valleyR) ? '✅ does not exceed' : '⚠');
console.log('JS errors:', errors.length ? errors : 'none');
await browser.close();
