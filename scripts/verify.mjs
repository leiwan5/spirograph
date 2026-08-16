// 无头浏览器冒烟验证：打开应用页面，检查 JS 错误与画布渲染
import { chromium } from 'playwright-core';

const EDGE = '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
const URL = process.env.APP_URL || 'http://localhost:5273/';

const browser = await chromium.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push('CONSOLE: ' + m.text());
});

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

async function canvasStats() {
  return page.evaluate(() => {
    const c = document.getElementById('canvas');
    const ctx = c.getContext('2d');
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let colored = 0;
    let samples = 0;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      if (!(r === 255 && g === 255 && b === 255) && !(r === 0 && g === 0 && b === 0)) {
        colored++;
        if (samples < 3) { samples++; console.log('px', r, g, b); }
      }
    }
    return { w: c.width, h: c.height, colored };
  });
}

const info = await page.evaluate(() => ({
  ratio: document.getElementById('info-ratio').textContent,
  petals: document.getElementById('info-petals').textContent,
  turns: document.getElementById('info-turns').textContent,
  samples: document.getElementById('info-samples').textContent,
  pens: document.querySelectorAll('.pen-card').length,
}));
console.log('INFO:', JSON.stringify(info));
const stats = await canvasStats();
console.log('CANVAS:', JSON.stringify(stats));

// 交互冒烟：切外切模式
await page.click('[data-mode="outside"]');
await page.waitForTimeout(400);
const stats2 = await canvasStats();
console.log('CANVAS(outside):', JSON.stringify(stats2));

// 添加一支笔
await page.click('#add-pen');
await page.waitForTimeout(300);
const penCount = await page.evaluate(() => document.querySelectorAll('.pen-card').length);
console.log('PENS after add:', penCount);

// 随机灵感
await page.click('#random');
await page.waitForTimeout(500);
const info2 = await page.evaluate(() => ({
  ratio: document.getElementById('info-ratio').textContent,
  mode: document.querySelector('.seg button.active')?.textContent,
}));
console.log('AFTER RANDOM:', JSON.stringify(info2));
const stats3 = await canvasStats();
console.log('CANVAS(random):', JSON.stringify(stats3));

// 播放动画 2 秒后暂停
await page.click('#play');
await page.waitForTimeout(2000);
const playText = await page.textContent('#play');
await page.click('#play'); // 暂停
await page.waitForTimeout(300);
const playText2 = await page.textContent('#play');
console.log('PLAY BTN:', playText, '->', playText2);

// 应用一个预设
await page.evaluate(() => {
  const chips = [...document.querySelectorAll('#preset-chips .chip')];
  chips.find(c => c.textContent.includes('蛛网'))?.click();
});
await page.waitForTimeout(500);
const info3 = await page.evaluate(() => ({
  ratio: document.getElementById('info-ratio').textContent,
  petals: document.getElementById('info-petals').textContent,
  pens: document.querySelectorAll('.pen-card').length,
}));
console.log('PRESET 蛛网:', JSON.stringify(info3));

console.log('JS ERRORS:', errors.length ? errors : 'none');
await browser.close();
