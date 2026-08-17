import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
const EDGE = '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
const browser = await chromium.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto('http://localhost:5273/?ring=72&rolling=30&pen=40,e63946,2.5&pen=75,1d6fa5,2&scale=fixed&gears=1', { waitUntil: 'networkidle' });
await page.waitForTimeout(700);

// Static frame
const shot1 = await page.locator('#canvas').screenshot();
writeFileSync('scripts/shot-static.png', shot1);
console.log('static screenshot saved to shot-static.png');

// Play one frame (mid-animation)
await page.evaluate(() => {
  document.getElementById('speed').value = '0.5';
  document.getElementById('speed').dispatchEvent(new Event('input'));
});
await page.click('#play');
await page.waitForTimeout(1800); // mid-animation (speed 0.5, first pen ~30s/2=15s segment, at ~12% into pen one)
const shot2 = await page.locator('#canvas').screenshot();
writeFileSync('scripts/shot-anim.png', shot2);
console.log('animation frame screenshot saved to shot-anim.png');
await page.click('#play');
await browser.close();
