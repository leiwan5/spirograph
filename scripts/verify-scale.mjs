// 验证：fixed 模式下调笔一孔洞，笔二不再被连带缩放
import { chromium } from 'playwright-core';

const EDGE = '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
const browser = await chromium.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
await page.goto('http://localhost:5273/', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);

// 抓整幅画布，返回差异像素统计
async function capture() {
  return page.evaluate(() => {
    const c = document.getElementById('canvas');
    const ctx = c.getContext('2d');
    return Array.from(ctx.getImageData(0, 0, c.width, c.height).data);
  });
}
function diffPixels(a, b) {
  let n = 0;
  for (let i = 0; i < a.length; i += 4) {
    if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) n++;
  }
  return n;
}

// 笔一孔洞从 40 → 150
async function setPen1Hole(v) {
  await page.evaluate((val) => {
    const slider = document.querySelectorAll('.pen-card')[0].querySelector('.pen-hole');
    slider.value = String(val);
    slider.dispatchEvent(new Event('input'));
  }, v);
  await page.waitForTimeout(500);
}

async function run(mode) {
  // 切缩放模式
  await page.evaluate((m) => {
    const b = document.querySelector('#scale-seg button[data-scale="' + m + '"]');
    b.click();
  }, mode);
  await page.waitForTimeout(400);
  const before = await capture();
  await setPen1Hole(150);
  const after = await capture();
  await setPen1Hole(40); // 复位
  return diffPixels(before, after);
}

const diffAuto = await run('auto');
const diffFixed = await run('fixed');
console.log('auto 模式  差异像素:', diffAuto);
console.log('fixed 模式 差异像素:', diffFixed);
console.log('结论:', diffFixed < diffAuto * 0.5
  ? '✅ fixed 模式下笔二不再被连带缩放（差异仅来自笔一曲线自身变化）'
  : '⚠ 差异比例不足，需要检查');

// fixed 模式下笔二曲线像素是否完全不动：对比排除笔一后的区域
// 更严格：fixed 模式下抓"笔二曲线经过的像素"在改孔洞前后必须 100% 相同
const strict = await page.evaluate(async () => {
  const c = document.getElementById('canvas');
  const ctx = c.getContext('2d');
  const img1 = ctx.getImageData(0, 0, c.width, c.height).data;
  // 改笔一孔洞
  const slider = document.querySelectorAll('.pen-card')[0].querySelector('.pen-hole');
  slider.value = '150';
  slider.dispatchEvent(new Event('input'));
  await new Promise((r) => setTimeout(r, 500));
  const img2 = ctx.getImageData(0, 0, c.width, c.height).data;
  slider.value = '40';
  slider.dispatchEvent(new Event('input'));
  // 找出改前"非背景且非笔一红色"的像素（即笔二蓝色像素），检查它们改后是否仍在原位
  let pen2Pixels = 0, pen2Changed = 0;
  for (let i = 0; i < img1.length; i += 4) {
    const r = img1[i], g = img1[i + 1], b = img1[i + 2];
    const isPen2Blue = b > 120 && g > 80 && g < 150 && r < 80; // #1d6fa5 ≈ (29,111,165)
    if (isPen2Blue) {
      pen2Pixels++;
      if (img2[i] !== r || img2[i + 1] !== g || img2[i + 2] !== b) pen2Changed++;
    }
  }
  return { pen2Pixels, pen2Changed };
});
console.log('fixed 模式笔二蓝色像素:', strict.pen2Pixels, '| 变动:', strict.pen2Changed,
  strict.pen2Pixels > 500 && strict.pen2Changed === 0 ? '✅ 笔二像素纹丝不动' : '⚠ 有变动');
console.log('ERRORS:', errors.length ? errors : 'none');
await browser.close();
