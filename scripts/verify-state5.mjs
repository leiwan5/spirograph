// Ultimate verification: fully read the state object
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

console.log('== initial full state ==');
console.log(JSON.stringify(await page.evaluate(() => window.__dshStore.getState()), null, 1));

await page.evaluate(() => {
  document.querySelector('#scale-seg button[data-scale="fixed"]').click();
});
await page.waitForTimeout(400);
console.log('== after clicking fixed ==');
console.log(JSON.stringify(await page.evaluate(() => ({
  state: window.__dshStore.getState(),
  render: window.__dshRender,
})), null, 1));
await browser.close();
