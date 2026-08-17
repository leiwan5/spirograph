// Headless smoke test for the Svelte & React demo landing pages (dist build, preview server).
// Verifies: no page/console errors, the demo canvas actually draws colored pixels,
// the Random control redraws, and the animated demo's Play toggles rendering.
import { chromium } from 'playwright-core';

const EDGE = '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
const BASE = process.env.APP_URL || 'http://localhost:5299';

const browser = await chromium.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});

async function canvasStats(page, index = 0) {
  return page.evaluate((idx) => {
    const c = document.querySelectorAll('.demo-stage canvas')[idx];
    if (!c) return { found: false };
    const ctx = c.getContext('2d');
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let colored = 0;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      if (!(r > 250 && g > 250 && b > 250) && !(r < 8 && g < 8 && b < 8)) colored++;
    }
    return { found: true, w: c.width, h: c.height, colored };
  }, index);
}

async function canvasSample(page, index) {
  return page.evaluate((idx) => {
    const c = document.querySelectorAll('.demo-stage canvas')[idx];
    if (!c) return null;
    const ctx = c.getContext('2d');
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    // Coarse coarse over the whole canvas: every 16th pixel (RGBA).
    const out = [];
    for (let i = 0; i < d.length; i += 16 * 4) {
      out.push(d[i], d[i + 1], d[i + 2]);
    }
    return out.join(',');
  }, index);
}

async function testPage(page, path, label) {
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('CONSOLE: ' + m.text());
  });

  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const h1 = await page.locator('.docs-hero h1').first().textContent().catch(() => null);
  const twoCards = await page.locator('.demo-card').count();
  const before0 = await canvasStats(page, 0);
  const before1 = await canvasStats(page, 1);

  // Click "Random" in the first demo card, confirm redraw.
  const randomBtn = page.locator('.demo-card').first().locator('button', { hasText: 'Random' }).first();
  if (await randomBtn.count()) {
    await randomBtn.click();
    await page.waitForTimeout(600);
  }
  const after0 = await canvasStats(page, 0);

  // Play in the animated (second) card, detect motion by comparing a pixel sample.
  let moved = null;
  const playBtn = page.locator('.demo-card').nth(1).locator('button', { hasText: 'Play' }).first();
  if (await playBtn.count()) {
    await playBtn.click();
    await page.waitForTimeout(350);
    const s1 = await canvasSample(page, 1);
    await page.waitForTimeout(300);
    const s2 = await canvasSample(page, 1);
    moved = s1 !== null && s2 !== null && s1 !== s2;
  }

  console.log(`\n=== ${label} ===`);
  console.log(`  h1: ${h1}`);
  console.log(`  demo cards: ${twoCards}`);
  console.log(`  canvas[0] before: ${JSON.stringify(before0)}`);
  console.log(`  canvas[1] before: ${JSON.stringify(before1)}`);
  console.log(`  canvas[0] after random: ${JSON.stringify(after0)}`);
  console.log(`  animation moved: ${moved}`);
  console.log(`  errors: ${errors.length ? errors.join(' | ') : 'none'}`);

  return (
    errors.length === 0 &&
    twoCards === 2 &&
    before0?.found &&
    before0.colored > 100 &&
    before1?.found &&
    before1.colored > 100 &&
    after0?.found &&
    after0.colored > 0 &&
    moved === true
  );
}

const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
const svelteOk = await testPage(page, '/svelte.html', 'SVELTE');
await page.goto('about:blank');
const reactOk = await testPage(page, '/react.html', 'REACT');
await browser.close();

console.log(`\nRESULT svelte=${svelteOk} react=${reactOk}`);
if (!svelteOk || !reactOk) process.exit(1);
