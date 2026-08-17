import { chromium } from 'playwright-core';
const EDGE = '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
const browser = await chromium.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const GRAD = 'ring=72&rolling=30&pen=40,e63946,2.5,20,40,1d6fa5'; // start 20, length 40, no loop
await page.goto('http://localhost:5273/?' + GRAD, { waitUntil: 'networkidle' });
await page.waitForTimeout(600);

// Unified in-page analysis function: given an image src (same-origin URL), returns the color distribution by progress position
async function sampleColors(src) {
  return page.evaluate(async (url) => {
    const resp = await fetch(url);
    const blob = await resp.blob();
    const dataUrl = await new Promise((res) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.readAsDataURL(blob);
    });
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const cv = document.createElement('canvas');
        cv.width = img.naturalWidth; cv.height = img.naturalHeight;
        const ctx = cv.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
        // Count the color distribution on the gradient curve (excluding background): the middle (interpolation) region should have non-black non-white colors
        let midColors = 0, black = 0, total = 0;
        const seen = new Set();
        for (let i = 0; i < d.length; i += 16) {
          const r = d[i], g = d[i + 1], b = d[i + 2];
          if (r > 240 && g > 240 && b > 240) continue;
          total++;
          if (r < 20 && g < 20 && b < 20) black++;
          else seen.add((r >> 3) + ',' + (g >> 3) + ',' + (b >> 3));
        }
        midColors = seen.size;
        resolve({ total, black, distinct: midColors });
      };
      img.src = dataUrl;
    });
  }, src);
}

// Screen render color statistics (same method)
const screen = await page.evaluate(() => {
  const c = document.getElementById('canvas');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let black = 0, total = 0;
  const seen = new Set();
  for (let i = 0; i < d.length; i += 16) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    if (r > 240 && g > 240 && b > 240) continue;
    total++;
    if (r < 20 && g < 20 && b < 20) black++;
    else seen.add((r >> 3) + ',' + (g >> 3) + ',' + (b >> 3));
  }
  return { total, black, distinct: seen.size };
});

const apiPng = await sampleColors('/api/image?' + GRAD + '&format=png&size=512');
const apiSvg = await sampleColors('/api/image?' + GRAD + '&format=svg&size=512');

console.log('screen render:  black', screen.black, '| distinct colors', screen.distinct, '| total', screen.total);
console.log('/api PNG:      black', apiPng.black, '| distinct colors', apiPng.distinct, '| total', apiPng.total);
console.log('/api SVG:      black', apiSvg.black, '| distinct colors', apiSvg.distinct, '| total', apiSvg.total);
console.log('verdict:');
console.log('  NaN black pixels fixed:', apiPng.black === 0 && apiSvg.black === 0 ? '✅ no black (previously the interpolation segment was all black)' : '⚠ still black');
console.log('  gradient colors rich:', screen.distinct > 10 && apiPng.distinct > 10 && apiSvg.distinct > 10 ? '✅ gradient on every path' : '⚠');
await browser.close();
