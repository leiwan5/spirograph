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

// 用户 URL
const URL = 'http://localhost:5273/?ring=73&rolling=15&mode=inside&pen=57%2C2a9d8f%2C1.8&pen=36%2C1d6fa5%2C2.1&pen=74%2C9b5de5%2C2.7&bg=ffffff&speed=2.9&scale=auto&gears=1';
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(700);

// 播放 3 秒（3 笔分步：第一支笔 5s 完成，此时应处于笔一阶段）
await page.click('#play');
await page.waitForTimeout(1500);
const mid = await page.evaluate(() => {
  const c = document.getElementById('canvas');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let n = 0, gray = 0, pen2 = 0;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    if (!(r === 255 && g === 255 && b === 255)) {
      n++;
      if (Math.abs(r - g) < 15 && Math.abs(g - b) < 15 && r > 100 && r < 220) gray++;
      // 笔二 1d6fa5 (29,111,165)
      if (b > 130 && g > 90 && g < 135 && r < 60) pen2++;
    }
  }
  return { n, gray, pen2 };
});
console.log('用户URL播放1.5s:', JSON.stringify(mid),
  '| 画布有内容:', mid.n > 5000, '| 齿轮可见:', mid.gray > 1000, '| 分步(笔二未开始):', mid.pen2 < 100);
await page.click('#play'); // 暂停
// 播放完成（速度调快）
await page.evaluate(() => {
  const s = document.getElementById('speed');
  s.value = '10'; s.dispatchEvent(new Event('input'));
});
await page.click('#play');
await page.waitForTimeout(6000);
const done = await page.evaluate(() => {
  const c = document.getElementById('canvas');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let pen3 = 0;
  for (let i = 0; i < d.length; i += 4) {
    // 笔三 9b5de5 (155,93,229)
    if (d[i + 2] > 200 && d[i] > 100 && d[i] < 190 && d[i + 1] < 130) pen3++;
  }
  return pen3;
});
console.log('播放完成 笔三像素:', done, done > 300 ? '✅' : '⚠');
console.log('JS错误:', errors.length ? errors : '无');
await browser.close();
