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
// 渐变 + 循环 URL
const GRAD = 'ring=72&rolling=30&pen=40,e63946,2.5,10,30,1,1d6fa5';
await page.goto('http://localhost:5273/?' + GRAD, { waitUntil: 'networkidle' });
await page.waitForTimeout(600);

// 在页面里定义像素分析函数
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
console.log('1) /api/image PNG: 红', png.red, '蓝', png.blue, png.red > 100 && png.blue > 100 ? '✅ 渐变' : '⚠');

// 2) /api/image SVG（转 canvas 分析）
const svg = await analyzePixels('/api/image?' + GRAD + '&format=svg&size=512');
console.log('2) /api/image SVG: 红', svg.red, '蓝', svg.blue, svg.red > 100 && svg.blue > 100 ? '✅ 渐变' : '⚠');

// 3) UI 导出 PNG（下载文件分析）
await page.evaluate(() => { document.getElementById('img-size').value = '512'; });
const [pngDl] = await Promise.all([
  page.waitForEvent('download', { timeout: 10000 }),
  page.click('#export-png'),
]);
const fs = await import('node:fs');
const pngPath = await pngDl.path();
// 用页面 canvas 分析下载的 PNG
const uiPng = await page.evaluate(async (p) => {
  const buf = await (await fetch('file://' + p)).arrayBuffer(); // file 协议 fetch 不行
  return null;
}, pngPath);
console.log('3) UI 导出 PNG 文件大小:', fs.statSync(pngPath).size, 'B（内容分析改用 dataURL 读取）');
// 用 base64 读入分析
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
console.log('3) UI 导出 PNG: 红', uiPngResult.red, '蓝', uiPngResult.blue, uiPngResult.red > 100 && uiPngResult.blue > 100 ? '✅ 渐变' : '⚠');

// 4) UI 导出 SVG（多段 path 颜色）
const [svgDl] = await Promise.all([
  page.waitForEvent('download', { timeout: 10000 }),
  page.click('#export-svg'),
]);
const svgText = fs.readFileSync(await svgDl.path(), 'utf8');
const strokes = [...svgText.matchAll(/stroke="([^"]*)"/g)].map((m) => m[1]);
console.log('4) UI 导出 SVG: path 数', strokes.length, '| 去重色', new Set(strokes).size, new Set(strokes).size > 5 ? '✅ 渐变' : '⚠');
console.log('JS错误:', errors.length ? errors : '无');
await browser.close();
