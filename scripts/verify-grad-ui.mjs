import { chromium } from 'playwright-core';
const EDGE = '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
const browser = await chromium.launch({ executablePath: EDGE, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://localhost:5273/?ring=72&rolling=30&pen=40,e63946,2.5', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);

// 1) 勾选渐变 → 出现 2 色 + 间隔滑块
await page.evaluate(() => document.querySelectorAll('.pen-card')[0].querySelector('.pen-grad').click());
await page.waitForTimeout(300);
const s1 = await page.evaluate(() => {
  const p = window.__dshStore.getState().pens[0];
  return { n: p.gradient.length, spacing: p.gradientSpacing, swatches: document.querySelectorAll('.pen-grad-colors input').length, optVisible: !!document.querySelector('.pen-grad-opts.show') };
});
console.log('1) 勾选渐变:', JSON.stringify(s1), s1.n === 2 && s1.swatches === 2 && s1.optVisible ? '✅' : '⚠');

// 2) 添加色到 4 + 调间隔
await page.evaluate(() => {
  const g = () => document.querySelectorAll('.pen-card')[0];
  g().querySelector('.pen-grad-add').click();
  g().querySelector('.pen-grad-add').click(); // 到 4 色
  const sp = g().querySelector('.pen-grad-spacing');
  sp.value = '15'; sp.dispatchEvent(new Event('input'));
});
await page.waitForTimeout(300);
const s2 = await page.evaluate(() => {
  const p = window.__dshStore.getState().pens[0];
  return { n: p.gradient.length, spacing: p.gradientSpacing, addDisabled: document.querySelectorAll('.pen-card')[0].querySelector('.pen-grad-add').disabled };
});
console.log('2) 4色+间隔15:', JSON.stringify(s2), s2.n === 4 && s2.spacing === 15 && s2.addDisabled ? '✅' : '⚠');

// 3) 删一个色（回到 3）
await page.evaluate(() => {
  const g = () => document.querySelectorAll('.pen-card')[0];
  const dels = g().querySelectorAll('.pen-grad-del');
  dels[0].click();
});
await page.waitForTimeout(300);
const s3 = await page.evaluate(() => window.__dshStore.getState().pens[0].gradient.length);
console.log('3) 删色后:', s3, s3 === 3 ? '✅' : '⚠');

// 4) 画布渲染渐变（颜色种类）
await page.evaluate(() => { document.getElementById('img-size').value = '512'; });
const colors = await page.evaluate(() => {
  const c = document.getElementById('canvas');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  const seen = new Set();
  for (let i = 0; i < d.length; i += 8) {
    const r=d[i],g=d[i+1],b=d[i+2];
    if (r>240&&g>240&&b>240) continue;
    seen.add((r>>4)+','+(g>>4)+','+(b>>4));
  }
  return seen.size;
});
console.log('4) 画布渐变颜色种类:', colors, colors > 20 ? '✅ 渐变可见' : '⚠');
console.log('JS错误:', errors.length ? errors : '无');
await browser.close();
