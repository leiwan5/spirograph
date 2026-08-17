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
await page.goto('http://localhost:5273/?ring=96&rolling=63&pen=35,f15bb5,2.5&pen=65,9b5de5,2&scale=fixed', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);

// Click the copy button
await page.click('#copy-image-link');
await page.waitForTimeout(400);
const copied = await page.evaluate(() => navigator.clipboard.readText());
console.log('clipboard content:', copied);
const ok = copied.startsWith('http://localhost:5273/api/image?') && copied.includes('format=png') && copied.includes('ring=96') && copied.includes('pen=35%2Cf15bb5%2C2.5');
console.log('URL structure:', ok ? '✅ contains /api/image + format=png + all params' : '⚠ ' + copied);

// Button feedback
const btnText = await page.textContent('#copy-image-link');
console.log('button feedback:', btnText, btnText.includes('Copied') ? '✅' : '⚠');
// The copied URL can load an image
const imgOk = await page.evaluate(async (url) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ ok: true, w: img.naturalWidth });
    img.onerror = () => resolve({ ok: false });
    img.src = url;
  });
}, copied);
console.log('copied link can show image:', imgOk.ok ? '✅ ' + imgOk.w + 'px' : '❌');
console.log('JS errors:', errors.length ? errors : 'none');
await browser.close();
