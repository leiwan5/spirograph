// 复现：72×30，笔一 hole=39，笔二 hole=79
// 场景A(auto)：变动笔一 → 笔二是否变？  场景B(auto)：变动笔二 → 笔一是否变？
// 场景C(fixed)：变动笔二 → 笔一是否变？
import { chromium } from 'playwright-core';

const EDGE = '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
const browser = await chromium.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto('http://localhost:5273/', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);

// 设置齿轮 72+30，笔一 hole=39，笔二 hole=79
await page.evaluate(() => {
  const pens = document.querySelectorAll('.pen-card');
  const h1 = pens[0].querySelector('.pen-hole');
  h1.value = '39'; h1.dispatchEvent(new Event('input'));
  const h2 = pens[1].querySelector('.pen-hole');
  h2.value = '79'; h2.dispatchEvent(new Event('input'));
});
await page.waitForTimeout(600);

function setScaleMode(m) {
  return page.evaluate((mode) => {
    document.querySelector('#scale-seg button[data-scale="' + mode + '"]').click();
  }, m);
}
function setHole(penIdx, v) {
  return page.evaluate(([idx, val]) => {
    const slider = document.querySelectorAll('.pen-card')[idx].querySelector('.pen-hole');
    slider.value = String(val);
    slider.dispatchEvent(new Event('input'));
  }, [penIdx, v]);
}

async function capture() {
  return page.evaluate(() => {
    const c = document.getElementById('canvas');
    return Array.from(c.getContext('2d').getImageData(0, 0, c.width, c.height).data);
  });
}

async function measure(label, setup, change) {
  await setup();
  await page.waitForTimeout(500);
  const before = await capture();
  await change();
  await page.waitForTimeout(500);
  const after = await capture();
  let diff = 0;
  for (let i = 0; i < before.length; i += 4) {
    if (before[i] !== after[i] || before[i + 1] !== after[i + 1] || before[i + 2] !== after[i + 2]) diff++;
  }
  console.log(label + ': 差异像素 =', diff);
  return diff;
}

// A. auto 模式：笔一 39 → 20
await setScaleMode('auto');
await measure('A [auto] 变动笔一(39→20)，全图差异',
  async () => { await setHole(0, 39); await setHole(1, 79); },
  async () => { await setHole(0, 20); });

// B. auto 模式：笔二 79 → 40
await measure('B [auto] 变动笔二(79→40)，全图差异',
  async () => { await setHole(0, 39); await setHole(1, 79); },
  async () => { await setHole(1, 40); });

// C. fixed 模式：笔二 79 → 40
await setScaleMode('fixed');
await measure('C [fixed] 变动笔二(79→40)，全图差异',
  async () => { await setHole(0, 39); await setHole(1, 79); },
  async () => { await setHole(1, 40); });

await browser.close();
