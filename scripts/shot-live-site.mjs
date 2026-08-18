// Capture screenshots of the live deployed spirograph site.
import { chromium } from 'playwright-core';

const CHROME = '/Users/danielking/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const URL = 'https://leiwan5.github.io/spirograph/';

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });

try {
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
  // Let canvas/animation settle
  await page.waitForTimeout(2500);

  // Finished-pattern static screenshot (viewport)
  await page.screenshot({ path: 'docs/images/live-site.png' });

  // Workflow screenshot (toolbar / controls) if worth capturing
  await page.screenshot({ path: 'docs/images/live-site-full.png', fullPage: true });

  console.log('Captured live-site.png and live-site-full.png');
} catch (e) {
  console.error('Capture failed:', e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
