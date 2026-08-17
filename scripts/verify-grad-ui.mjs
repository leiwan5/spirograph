import { chromium } from 'playwright-core';
const EDGE = '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
const browser = await chromium.launch({ executablePath: EDGE, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://localhost:5273/?ring=72&rolling=30&pen=40,e63946,2.5', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);

// 1) check gradient -> 2 colors + spacing slider appear
await page.evaluate(() => document.querySelectorAll('.pen-card')[0].querySelector('.pen-grad').click());
await page.waitForTimeout(300);
const s1 = await page.evaluate(() => {
  const p = window.__dshStore.getState().pens[0];
  return { n: p.gradient.length, spacing: p.gradientSpacing, swatches: document.querySelectorAll('.pen-grad-colors input').length, optVisible: !!document.querySelector('.pen-grad-opts.show') };
});
console.log('1) check gradient:', JSON.stringify(s1), s1.n === 2 && s1.swatches === 2 && s1.optVisible ? 'OK' : 'WARN');

// 2) add colors to 4 + adjust spacing
await page.evaluate(() => {
  const g = () => document.querySelectorAll('.pen-card')[0];
  g().querySelector('.pen-grad-add').click();
  g().querySelector('.pen-grad-add').click(); // to 4 colors
  const sp = g().querySelector('.pen-grad-spacing');
  sp.value = '15'; sp.dispatchEvent(new Event('input'));
});
await page.waitForTimeout(300);
const s2 = await page.evaluate(() => {
  const p = window.__dshStore.getState().pens[0];
  return { n: p.gradient.length, spacing: p.gradientSpacing, addDisabled: document.querySelectorAll('.pen-card')[0].querySelector('.pen-grad-add').disabled };
});
console.log('2) 4 colors + spacing 15:', JSON.stringify(s2), s2.n === 4 && s2.spacing === 15 && s2.addDisabled ? 'OK' : 'WARN');

// 3) delete one color (back to 3)
await page.evaluate(() => {
  const g = () => document.querySelectorAll('.pen-card')[0];
  const dels = g().querySelectorAll('.pen-grad-del');
  dels[0].click();
});
await page.waitForTimeout(300);
const s3 = await page.evaluate(() => window.__dshStore.getState().pens[0].gradient.length);
console.log('3) after deleting a color:', s3, s3 === 3 ? 'OK' : 'WARN');

// 4) canvas renders gradient (color variety)
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
console.log('4) canvas gradient color variety:', colors, colors > 20 ? 'OK gradient visible' : 'WARN');
console.log('JS errors:', errors.length ? errors : 'none');
await browser.close();
