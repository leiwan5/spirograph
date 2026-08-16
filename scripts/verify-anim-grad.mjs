import { chromium } from 'playwright-core';
const EDGE = '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
const browser = await chromium.launch({ executablePath: EDGE, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://localhost:5273/?ring=72&rolling=30&pen=40,e63946,2.5,15:1d6fa5:5~30:f4a261:0&scale=fixed&gears=1', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
// 播放后抓多帧
await page.click('#play');
let samples = [];
for (let i = 0; i < 5; i++) {
  await page.waitForTimeout(600);
  samples.push(await page.evaluate(() => {
    const c = document.getElementById('canvas');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let j = 0; j < d.length; j += 4) if (!(d[j] === 255 && d[j + 1] === 255 && d[j + 2] === 255)) n++;
    return n;
  }));
}
await page.click('#play');
console.log('动画各帧非背景像素:', samples.join(' | '));
console.log('最终帧:', samples[samples.length - 1], samples[samples.length - 1] > 5000 ? '✅ 动画正常绘制' : '⚠');
console.log('JS错误:', errors.length ? errors : '无');
await browser.close();
