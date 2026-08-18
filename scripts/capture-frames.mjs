// Capture frame sequences for gear-drawing GIF hero images.
// Usage: node scripts/capture-frames.mjs
// Requires the vite dev server running at http://localhost:5173.
import { chromium } from 'playwright-core';
import { mkdirSync, rmSync } from 'node:fs';

const CHROME = '/Users/danielking/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const BASE = 'http://localhost:5175/scripts/recorder.html';
const FRAMES = 30; // one full drawing loop

// Each hero: name + query params matching the package's visual identity.
// All use inside mode; the recorder forces fixed-ring scale so the ring stays a
// constant size and the pattern is drawn at true scale inside it.
const SPECS = [
  { name: 'gear-main',  params: 'ring=144&rolling=60&pen=40,e63946,2.5&bg=0b1026' },
  { name: 'gear-anim',  params: 'ring=144&rolling=60&pen=50,2,20,3a86ff,00bbf9,f4a261,ef476f&bg=0b1026' },
  { name: 'gear-react', params: 'ring=144&rolling=60&pen=45,2,30,00bbf9,f8961e&bg=101432' },
  { name: 'gear-svelte',params: 'ring=90&rolling=35&pen=55,2,30,ef476f,8338ec&bg=0f0f1e' },
];

const browser = await chromium.launch({ executablePath: CHROME, headless: true });

for (const spec of SPECS) {
  const dir = `scripts/.rec-frames/${spec.name}`;
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });

  const page = await browser.newPage({ viewport: { width: 700, height: 700 } });
  const url = `${BASE}?${spec.params}`;
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => window.__ready === true, { timeout: 20000 });
  // Ensure canvas laid out
  await page.waitForTimeout(600);

  const canvas = page.locator('#stage');
  for (let f = 0; f < FRAMES; f++) {
    const progress = f / (FRAMES - 1);
    await page.evaluate((p) => window.__drawFrame(p), progress);
    await page.waitForTimeout(16);
    await canvas.screenshot({ path: `${dir}/frame-${String(f).padStart(3, '0')}.png` });
  }
  console.log(`Captured ${FRAMES} frames -> ${dir}`);
  await page.close();
}

await browser.close();
console.log('All specs captured.');
