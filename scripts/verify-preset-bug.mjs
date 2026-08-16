// 复现用户 bug：预设/随机/URL 之后改动参数是否有反应
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

async function canvasHash() {
  return page.evaluate(() => {
    const c = document.getElementById('canvas');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let h = 0;
    for (let i = 0; i < d.length; i += 16) h = (h * 31 + d[i] * 3 + d[i + 1] * 5 + d[i + 2] * 7) | 0;
    return h;
  });
}

async function changePen1Hole(v) {
  await page.evaluate((val) => {
    const s = document.querySelectorAll('.pen-card')[0].querySelector('.pen-hole');
    s.value = String(val);
    s.dispatchEvent(new Event('input'));
  }, v);
  await page.waitForTimeout(400);
}

// 场景1：点预设 → 改参数
await page.goto('http://localhost:5273/', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
await page.evaluate(() => {
  [...document.querySelectorAll('#preset-chips .chip')].find((c) => c.textContent.includes('蛛网')).click();
});
await page.waitForTimeout(500);
const cardsAfterPreset = await page.evaluate(() => document.querySelectorAll('.pen-card').length);
const h1a = await canvasHash();
await changePen1Hole(80); // 预设第一支笔 hole 40 → 80
const h1b = await canvasHash();
console.log('1) 预设蛛网后:', '卡片数', cardsAfterPreset, '| 改孔洞画布变化:', h1a !== h1b ? '✅ 有反应' : '❌ 无反应（bug 复现）');

// 场景2：随机 → 改参数
await page.click('#random');
await page.waitForTimeout(500);
const cardsAfterRandom = await page.evaluate(() => document.querySelectorAll('.pen-card').length);
const h2a = await canvasHash();
await changePen1Hole(30);
const h2b = await canvasHash();
console.log('2) 随机灵感后:', '卡片数', cardsAfterRandom, '| 改孔洞画布变化:', h2a !== h2b ? '✅ 有反应' : '❌ 无反应');

// 场景3：URL 加载（多笔）→ 改参数
await page.goto('http://localhost:5273/?ring=144&rolling=60&mode=inside&pen=40,3a86ff,1.8&pen=70,00bbf9,1.5&pen=90,d9a404,1.5&bg=1b1b2f&scale=fixed', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
const h3a = await canvasHash();
await changePen1Hole(80);
const h3b = await canvasHash();
const cardsUrl = await page.evaluate(() => document.querySelectorAll('.pen-card').length);
console.log('3) URL 加载后:', '卡片数', cardsUrl, '| 改孔洞画布变化:', h3a !== h3b ? '✅ 有反应' : '❌ 无反应');

// 场景4：预设后滑块显示值是否与状态一致
await page.goto('http://localhost:5273/', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.evaluate(() => {
  [...document.querySelectorAll('#preset-chips .chip')].find((c) => c.textContent.includes('蛛网')).click();
});
await page.waitForTimeout(500);
const sliderVals = await page.evaluate(() => {
  const s = window.__dshStore.getState();
  const cards = [...document.querySelectorAll('.pen-card')];
  return cards.map((c, i) => ({
    state: s.pens[i]?.hole,
    slider: +c.querySelector('.pen-hole').value,
  }));
});
console.log('4) 预设后卡片与状态一致:', JSON.stringify(sliderVals),
  sliderVals.every((x) => x.state === x.slider) ? '✅' : '❌ 不一致');
console.log('JS错误:', errors.length ? errors : '无');
await browser.close();
