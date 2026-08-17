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
// Gradient + loop URL
const GRAD = 'ring=72&rolling=30&pen=40,e63946,2.5,10,30,1,1d6fa5';
await page.goto('http://localhost:5273/?' + GRAD, { waitUntil: 'networkidle' });
await page.waitForTimeout(600);

// Define the pixel analysis function in the page
async function analyzePixels(src) {
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
        let red = 0, blue = 0, total = 0;
        for (let i = 0; i < d.length; i += 16) {
          const r = d[i], g = d[i + 1], b = d[i + 2];
          if (r > 240 && g > 240 && b > 240) continue;
          total++;
          if (r > 180 && r - b > 80 && r - g > 80) red++;
          else if (b > 130 && b - r > 80 && g > 70 && g < 150) blue++;
        }
        resolve({ red, blue, total });
      };
      img.src = dataUrl;
    });
  }, src);
}

// 1) /api/image PNG
const png = await analyzePixels('/api/image?' + GRAD + '&format=png&size=512');
console.log('1) /api/image PNG: red', png.red, 'blue', png.blue, png.red > 100 && png.blue > 100 ? '✅ gradient' : '⚠');

// 2) /api/image SVG (analyze via canvas)
const svg = await analyzePixels('/api/image?' + GRAD + '&format=svg&size=512');
console.log('2) /api/image SVG: red', svg.red, 'blue', svg.blue, svg.red > 100 && svg.blue > 100 ? '✅ gradient' : '⚠');

// 3) UI export PNG (analyze the downloaded file)
await page.evaluate(() => { document.getElementById('img-size').value = '512'; });
const [pngDl] = await Promise.all([
  page.waitForEvent('download', { timeout: 10000 }),
  page.click('#export-png'),
]);
const fs = await import('node:fs');
const pngPath = await pngDl.path();
// Analyze the downloaded PNG using the page canvas
const uiPng = await page.evaluate(async (p) => {
  const buf = await (await fetch('file://' + p)).arrayBuffer(); // file protocol fetch does not work
  return null;
}, pngPath);
console.log('3) UI export PNG file size:', fs.statSync(pngPath).size, 'B (content analyzed via dataURL instead)');
// Read in via base64 and analyze
const pngB64 = fs.readFileSync(pngPath).toString('base64');
const uiPngResult = await page.evaluate(async (b64) => {
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/png;base64,' + b64; });
  const cv = document.createElement('canvas');
  cv.width = img.naturalWidth; cv.height = img.naturalHeight;
  const ctx = cv.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
  let red = 0, blue = 0, total = 0;
  for (let i = 0; i < d.length; i += 16) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    if (r > 240 && g > 240 && b > 240) continue;
    total++;
    if (r > 180 && r - b > 80 && r - g > 80) red++;
    else if (b > 130 && b - r > 80 && g > 70 && g < 150) blue++;
  }
  return { red, blue, total };
}, pngB64);
console.log('3) UI export PNG: red', uiPngResult.red, 'blue', uiPngResult.blue, uiPngResult.red > 100 && uiPngResult.blue > 100 ? '✅ gradient' : '⚠');

// 4) UI export SVG (multiple path colors)
const [svgDl] = await Promise.all([
  page.waitForEvent('download', { timeout: 10000 }),
  page.click('#export-svg'),
]);
const svgText = fs.readFileSync(await svgDl.path(), 'utf8');
const strokes = [...svgText.matchAll(/stroke="([^"]*)"/g)].map((m) => m[1]);
console.log('4) UI export SVG: path count', strokes.length, '| distinct colors', new Set(strokes).size, new Set(strokes).size > 5 ? '✅ gradient' : '⚠');
console.log('JS errors:', errors.length ? errors : 'none');
await browser.close();
