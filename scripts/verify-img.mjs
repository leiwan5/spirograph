// <img> 引用验证：/api/image 与 /?format= 都能被 img 加载
import { chromium } from 'playwright-core';
const EDGE = '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
const browser = await chromium.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage();
await page.goto('about:blank');

const result = await page.evaluate(async () => {
  function loadImg(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ ok: true, w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve({ ok: false });
      img.src = src;
    });
  }
  const base = 'http://localhost:5273';
  const qs = 'ring=72&rolling=30&pen=40,e63946,2.5&pen=75,1d6fa5,2';
  return {
    apiPng: await loadImg(base + '/api/image?' + qs + '&format=png&size=512'),
    rootPng: await loadImg(base + '/?' + qs + '&format=png&size=512'),
    apiSvg: await loadImg(base + '/api/image?' + qs + '&format=svg'),
    rootSvg: await loadImg(base + '/?' + qs + '&format=svg'),
    noFormat: await loadImg(base + '/?' + qs), // 无 format → HTML → 应失败
  };
});
console.log(JSON.stringify(result, null, 1));
const checks = [
  ['/api/image PNG', result.apiPng.ok && result.apiPng.w === 512],
  ['/?format=png', result.rootPng.ok && result.rootPng.w === 512],
  ['/api/image SVG', result.apiSvg.ok],
  ['/?format=svg', result.rootSvg.ok],
  ['无 format 返回 HTML（img 应失败）', !result.noFormat.ok],
];
for (const [name, ok] of checks) console.log((ok ? '✅' : '❌') + ' ' + name);
await browser.close();
