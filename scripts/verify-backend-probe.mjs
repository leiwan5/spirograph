// Verify backend API probe: with a backend (vite preview middleware) -> link button shown; pure static -> hidden
import { chromium } from 'playwright-core';
const EDGE = '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
const browser = await chromium.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});

async function check(url, label) {
  const context = await browser.newContext();
  const page = await context.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url, { waitUntil: 'networkidle' });
  // Wait for probe to finish (default 6s timeout; normal scenarios complete instantly)
  await page.waitForTimeout(1200);
  const visible = await page.evaluate(() => {
    const btn = document.querySelector('#copy-image-link');
    return btn ? !btn.hidden && btn.offsetParent !== null : false;
  });
  console.log(`${label}: link button ${visible ? '✅ shown' : '❌ hidden'}`);
  console.log(`  JS errors: ${errors.length ? errors : 'none'}`);
  await context.close();
  return visible;
}

const withBackend = await check('http://localhost:5273/?ring=96&rolling=63&pen=35,f15bb5,2.5&scale=fixed', '[backend vite preview]');
const noBackend = await check('http://localhost:5274/?ring=96&rolling=63&pen=35,f15bb5,2.5&scale=fixed', '[pure static http.server]');

await browser.close();
console.log('\nresult:', withBackend && !noBackend ? '✅ all as expected' : '⚠ does not match expectation');