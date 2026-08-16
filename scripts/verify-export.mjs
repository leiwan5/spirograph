// 导出功能验证：PNG/SVG 下载
import { chromium } from 'playwright-core';

const EDGE = '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
const browser = await chromium.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
await page.goto('http://localhost:5273/', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);

// SVG 导出
const [svgDownload] = await Promise.all([
  page.waitForEvent('download', { timeout: 10000 }),
  page.click('#export-svg'),
]);
const svgPath = await svgDownload.path();
const fs = await import('node:fs');
const svgText = fs.readFileSync(svgPath, 'utf8');
console.log('SVG export:', svgDownload.suggestedFilename(), '| size:', svgText.length, '| has path:', svgText.includes('<path'), '| has bg rect:', svgText.includes('<rect'));

// PNG 导出
const [pngDownload] = await Promise.all([
  page.waitForEvent('download', { timeout: 10000 }),
  page.click('#export-png'),
]);
const pngPath = await pngDownload.path();
const pngBuf = fs.readFileSync(pngPath);
console.log('PNG export:', pngDownload.suggestedFilename(), '| bytes:', pngBuf.length, '| PNG magic:', pngBuf[0] === 0x89 && pngBuf[1] === 0x50);

// 动画完整播放（速度 10×，15s 基准 → 1.5s 完成）
await page.evaluate(() => {
  const s = document.getElementById('speed');
  s.value = '10';
  s.dispatchEvent(new Event('input'));
});
await page.click('#play');
await page.waitForTimeout(4000);
const playText = await page.textContent('#play');
console.log('动画播放后按钮状态（应恢复为"▶ 播放绘制"）:', playText);
console.log('ERRORS:', errors.length ? errors : 'none');
await browser.close();
