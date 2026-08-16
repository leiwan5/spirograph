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

// 1) URL 加载 3 断点渐变（用户例子语义）：体当前端 gradientColorAt 渲染
// 直接验证单测已覆盖，这里验证 URL 解析 + 画布颜色分布
await page.goto('http://localhost:5273/?ring=72&rolling=30&pen=40,e63946,2.5,15:1d6fa5:5~30:f4a261:0', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
const state = await page.evaluate(() => {
  const p = window.__dshStore.getState().pens[0];
  return { gradient: p.gradient, loop: p.gradientLoop };
});
console.log('1) URL 3断点: gradient', JSON.stringify(state.gradient), state.gradient.length === 2 && state.gradient[0].pos === 15 ? '✅' : '⚠');

// 2) UI 控件：默认笔勾选渐变 → 出现 2 断点
await page.goto('http://localhost:5273/?ring=72&rolling=30&pen=40,e63946,2.5', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
await page.evaluate(() => document.querySelectorAll('.pen-card')[0].querySelector('.pen-grad').click());
await page.waitForTimeout(300);
const uiState = await page.evaluate(() => {
  const p = window.__dshStore.getState().pens[0];
  const stops = document.querySelectorAll('.pen-card')[0].querySelectorAll('.grad-stop').length;
  return { gradient: p.gradient, stopRows: stops };
});
console.log('2) 勾选渐变: 断点', uiState.gradient.length, '| UI行数', uiState.stopRows, uiState.gradient.length === 2 && uiState.stopRows === 2 ? '✅' : '⚠');

// 3) 添加断点到 3，改位置/过渡
await page.evaluate(() => {
  const card = document.querySelectorAll('.pen-card')[0];
  card.querySelector('.pen-grad-add').click();
  const rows = card.querySelectorAll('.grad-stop');
  // 改第 0 断点 pos → 20
  const pos0 = rows[0].querySelector('.pen-grad-pos');
  pos0.value = '20'; pos0.dispatchEvent(new Event('input'));
});
await page.waitForTimeout(300);
const state3 = await page.evaluate(() => {
  const p = window.__dshStore.getState().pens[0];
  return { n: p.gradient.length, pos0: p.gradient[0].pos };
});
console.log('3) 3断点+改位置:', JSON.stringify(state3), state3.n === 3 && state3.pos0 === 20 ? '✅' : '⚠');

// 4) 导出 SVG 含多断点颜色
await page.evaluate(() => { document.getElementById('img-size').value = '512'; });
const [svgDl] = await Promise.all([
  page.waitForEvent('download', { timeout: 10000 }),
  page.click('#export-svg'),
]);
const fs = await import('node:fs');
const svgText = fs.readFileSync(await svgDl.path(), 'utf8');
const strokes = [...svgText.matchAll(/stroke="([^"]*)"/g)].map((m) => m[1]);
console.log('4) SVG: path数', strokes.length, '| 去重色', new Set(strokes).size, new Set(strokes).size > 5 ? '✅' : '⚠');

// 5) /api/image PNG 无 NaN（渐变颜色丰富）
const png = await page.evaluate(async () => {
  const resp = await fetch('/api/image?ring=72&rolling=30&pen=40,e63946,2.5,15:1d6fa5:5~30:f4a261:0&format=png&size=256');
  const blob = await resp.blob();
  const dataUrl = await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); });
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement('canvas');
      cv.width = 256; cv.height = 256;
      const ctx = cv.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, 256, 256).data;
      let black = 0, colored = 0;
      const seen = new Set();
      for (let i = 0; i < d.length; i += 8) {
        const r = d[i], g = d[i + 1], b = d[i + 2];
        if (r > 240 && g > 240 && b > 240) continue;
        if (r < 20 && g < 20 && b < 20) black++;
        else { colored++; seen.add((r >> 4) + ',' + (g >> 4) + ',' + (b >> 4)); }
      }
      resolve({ black, colored, distinct: seen.size });
    };
    img.src = dataUrl;
  });
});
console.log('5) /api PNG: 黑', png.black, '| 去重色', png.distinct, png.black === 0 && png.distinct > 5 ? '✅' : '⚠');

// 6) 动画回归
await page.click('#play');
await page.waitForTimeout(1200);
const mid = await page.evaluate(() => {
  const c = document.getElementById('canvas');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let n = 0;
  for (let i = 0; i < d.length; i += 4) if (!(d[i] === 255 && d[i + 1] === 255 && d[i + 2] === 255)) n++;
  return n;
});
await page.click('#play');
console.log('6) 动画:', mid > 5000 ? '✅ 有内容' : '⚠', '| JS错误:', errors.length ? errors : '无');
await browser.close();
