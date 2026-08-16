// 复现：勾选显示齿轮后播放动画，抓帧分析
import { chromium } from 'playwright-core';

const EDGE = '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
const browser = await chromium.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message + ' | ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

await page.goto('http://localhost:5273/', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);

// 勾选齿轮（默认状态：auto 模式 72×30 两笔）
await page.evaluate(() => {
  document.getElementById('show-gears').click();
});
await page.waitForTimeout(500);

// 播放前静态帧
const staticFrame = await page.evaluate(() => {
  const c = document.getElementById('canvas');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let nonBg = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (!(d[i] === 255 && d[i + 1] === 255 && d[i + 2] === 255)) nonBg++;
  }
  return nonBg;
});
console.log('播放前静态帧非背景像素:', staticFrame);

// 播放
await page.click('#play');
await page.waitForTimeout(500);
const frame1 = await page.evaluate(() => {
  const c = document.getElementById('canvas');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let nonBg = 0, gray = 0;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    if (!(r === 255 && g === 255 && b === 255)) {
      nonBg++;
      if (Math.abs(r - g) < 15 && Math.abs(g - b) < 15 && r > 100 && r < 220) gray++;
    }
  }
  return { nonBg, gray };
});
await page.waitForTimeout(800);
const frame2 = await page.evaluate(() => {
  const c = document.getElementById('canvas');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let nonBg = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (!(d[i] === 255 && d[i + 1] === 255 && d[i + 2] === 255)) nonBg++;
  }
  return nonBg;
});
console.log('播放中帧1 (500ms):', JSON.stringify(frame1));
console.log('播放中帧2 (1300ms): 非背景像素', frame2);
console.log('播放按钮状态:', await page.textContent('#play'));
console.log('JS错误:', errors.length ? errors : '无');

// 暂停并看最终画面
await page.click('#play');
await page.waitForTimeout(200);
const paused = await page.evaluate(() => {
  const c = document.getElementById('canvas');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let nonBg = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (!(d[i] === 255 && d[i + 1] === 255 && d[i + 2] === 255)) nonBg++;
  }
  return nonBg;
});
console.log('暂停后画面非背景像素:', paused);
await browser.close();
