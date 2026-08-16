// 显示齿轮功能端到端验证
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
await page.goto('http://localhost:5273/', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);

// 1) 勾选显示齿轮 → 静态图出现灰色齿轮像素
const before = await page.evaluate(() => {
  const c = document.getElementById('canvas');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let gray = 0;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    if (Math.abs(r - g) < 12 && Math.abs(g - b) < 12 && r > 60 && r < 200 && g < 160) gray++;
  }
  return gray;
});
await page.evaluate(() => {
  document.getElementById('show-gears').click();
});
await page.waitForTimeout(500);
const after = await page.evaluate(() => {
  const c = document.getElementById('canvas');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let gray = 0;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    if (Math.abs(r - g) < 12 && Math.abs(g - b) < 12 && r > 60 && r < 200 && g < 160) gray++;
  }
  return gray;
});
console.log('1) 勾选后灰色齿轮像素:', before, '→', after, after - before > 3000 ? '✅ 齿轮已显示' : '⚠ 齿轮不明显');

// 2) 播放动画 → 齿轮移动（两帧画面差异）
await page.evaluate(() => {
  document.getElementById('speed').value = '2';
  document.getElementById('speed').dispatchEvent(new Event('input'));
});
await page.click('#play');
await page.waitForTimeout(400);
const frame1 = await page.evaluate(() => {
  const c = document.getElementById('canvas');
  return Array.from(c.getContext('2d').getImageData(0, 0, c.width, c.height).data);
});
await page.waitForTimeout(400);
const frame2 = await page.evaluate(() => {
  const c = document.getElementById('canvas');
  return Array.from(c.getContext('2d').getImageData(0, 0, c.width, c.height).data);
});
await page.click('#play'); // 暂停
let diff = 0;
for (let i = 0; i < frame1.length; i += 4) {
  if (frame1[i] !== frame2[i] || frame1[i + 1] !== frame2[i + 1] || frame1[i + 2] !== frame2[i + 2]) diff++;
}
console.log('2) 动画两帧差异像素:', diff, diff > 1000 ? '✅ 齿轮+曲线在动' : '⚠ 无变化');

// 3) 多笔分步：动画中段（第一支笔完成前），第二支笔的蓝色像素应为 0
// 默认 2 笔。用 4 笔预设（蛛网）切到 fixed，播放到总进度 ~0.15（仍在第一支笔段内）
await page.goto('http://localhost:5273/?ring=144&rolling=60&pen=40,3a86ff,1.8&pen=70,00bbf9,1.5&pen=90,d9a404,1.5&gears=1', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
// 检查 state
const st = await page.evaluate(() => {
  const s = window.__dshStore.getState();
  return { showGears: s.showGears, pens: s.pens.length };
});
console.log('3a) URL gears=1 加载:', JSON.stringify(st), st.showGears === true ? '✅' : '❌');

// 播放，速度 0.3（慢），第一支笔完成前暂停（~2.5s 内）
await page.evaluate(() => {
  document.getElementById('speed').value = '0.3';
  document.getElementById('speed').dispatchEvent(new Event('input'));
});
await page.click('#play');
await page.waitForTimeout(2500); // 总时长 15s/0.3 = 50s，第一段 12.5s，此刻 ~5% 仍在笔一
const midFrame = await page.evaluate(() => {
  const c = document.getElementById('canvas');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  // 第二支笔颜色 00bbf9 (0,187,249)：检查是否有其"实线"像素
  let pen2Pixels = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 2] > 200 && d[i + 1] > 150 && d[i] < 60) pen2Pixels++;
  }
  return pen2Pixels;
});
await page.click('#play'); // 暂停
console.log('3b) 分步：笔一绘制中段，笔二实线像素:', midFrame, midFrame < 50 ? '✅ 分步生效（笔二还没开始）' : '⚠ 笔二提前出现');

// 4) 播完：3 支笔全部完成
await page.evaluate(() => {
  document.getElementById('speed').value = '10';
  document.getElementById('speed').dispatchEvent(new Event('input'));
});
await page.click('#play');
await page.waitForTimeout(6000);
const done = await page.evaluate(() => {
  const c = document.getElementById('canvas');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let pen2 = 0, pen3 = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 2] > 200 && d[i + 1] > 150 && d[i] < 60) pen2++;
    if (d[i] > 180 && d[i + 1] > 140 && d[i + 1] < 180 && d[i + 2] < 60) pen3++; // d9a404 金色
  }
  return { pen2, pen3 };
});
console.log('4) 播放完成: 笔二像素', done.pen2, '| 笔三像素', done.pen3, done.pen2 > 500 && done.pen3 > 500 ? '✅ 全部完成' : '⚠');
console.log('JS错误:', errors.length ? errors : '无');
await browser.close();
