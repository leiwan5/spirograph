import { chromium } from 'playwright-core';
const EDGE = '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
const browser = await chromium.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});
const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
const page = await context.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://localhost:5273/?ring=72&rolling=30&pen=40,e63946,2.5&pen=75,1d6fa5,2', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);

// 1) default 2048: copy link carries size=2048
await page.click('#copy-image-link');
await page.waitForTimeout(300);
const link1 = await page.evaluate(() => navigator.clipboard.readText());
console.log('1) default copy:', link1.includes('&size=2048') ? '✅ size=2048' : '⚠ ' + link1);

// 2) switch to 512: copy link carries size=512
await page.selectOption('#img-size', '512');
await page.click('#copy-image-link');
await page.waitForTimeout(300);
const link2 = await page.evaluate(() => navigator.clipboard.readText());
console.log('2) 512 copy:', link2.includes('&size=512') ? '✅ size=512' : '⚠');

// 3) the copied 512 link actually renders at 512px
const imgOk = await page.evaluate((url) => new Promise((resolve) => {
  const img = new Image();
  img.onload = () => resolve(img.naturalWidth);
  img.onerror = () => resolve(0);
  img.src = url;
}), link2);
console.log('3) 512 link image:', imgOk === 512 ? '✅ ' + imgOk + 'px' : '⚠ ' + imgOk);

// 4) exported PNG size = selected (512)
await page.selectOption('#img-size', '512');
const [download] = await Promise.all([
  page.waitForEvent('download', { timeout: 10000 }),
  page.click('#export-png'),
]);
const path = await download.path();
const fs = await import('node:fs');
const buf = fs.readFileSync(path);
const w = buf.readUInt32BE(16);
const h = buf.readUInt32BE(20);
console.log('4) export PNG:', w + 'x' + h, w === 512 ? '✅ matches selection' : '⚠');

// 5) exported SVG size = selected
const [svgDl] = await Promise.all([
  page.waitForEvent('download', { timeout: 10000 }),
  page.click('#export-svg'),
]);
const svgPath = await svgDl.path();
const svgText = fs.readFileSync(svgPath, 'utf8');
console.log('5) export SVG:', svgText.includes('width="512"') ? '✅ 512' : '⚠ ' + svgText.slice(0, 100));
console.log('JS errors:', errors.length ? errors : 'none');
await browser.close();
