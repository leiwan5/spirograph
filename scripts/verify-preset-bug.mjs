// Reproduce the user bug: after preset/random/URL, do parameter changes take effect?
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

// Scene 1: click preset -> change parameter
await page.goto('http://localhost:5273/', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
await page.evaluate(() => {
  [...document.querySelectorAll('#preset-chips .chip')].find((c) => c.textContent.includes('Spiderweb')).click();
});
await page.waitForTimeout(500);
const cardsAfterPreset = await page.evaluate(() => document.querySelectorAll('.pen-card').length);
const h1a = await canvasHash();
await changePen1Hole(80); // preset first pen hole 40 -> 80
const h1b = await canvasHash();
console.log('1) after preset Spiderweb:', 'card count', cardsAfterPreset, '| canvas changed by hole edit:', h1a !== h1b ? '✅ reacts' : '❌ no reaction (bug reproduced)');

// Scene 2: random -> change parameter
await page.click('#random');
await page.waitForTimeout(500);
const cardsAfterRandom = await page.evaluate(() => document.querySelectorAll('.pen-card').length);
const h2a = await canvasHash();
await changePen1Hole(30);
const h2b = await canvasHash();
console.log('2) after random:', 'card count', cardsAfterRandom, '| canvas changed by hole edit:', h2a !== h2b ? '✅ reacts' : '❌ no reaction');

// Scene 3: URL load (multi-pen) -> change parameter
await page.goto('http://localhost:5273/?ring=144&rolling=60&mode=inside&pen=40,3a86ff,1.8&pen=70,00bbf9,1.5&pen=90,d9a404,1.5&bg=1b1b2f&scale=fixed', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
const h3a = await canvasHash();
await changePen1Hole(80);
const h3b = await canvasHash();
const cardsUrl = await page.evaluate(() => document.querySelectorAll('.pen-card').length);
console.log('3) after URL load:', 'card count', cardsUrl, '| canvas changed by hole edit:', h3a !== h3b ? '✅ reacts' : '❌ no reaction');

// Scene 4: after a preset, do the sliders' displayed values match the state
await page.goto('http://localhost:5273/', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.evaluate(() => {
  [...document.querySelectorAll('#preset-chips .chip')].find((c) => c.textContent.includes('Spiderweb')).click();
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
console.log('4) cards/state consistent after preset:', JSON.stringify(sliderVals),
  sliderVals.every((x) => x.state === x.slider) ? '✅' : '❌ inconsistent');
console.log('JS errors:', errors.length ? errors : 'none');
await browser.close();
