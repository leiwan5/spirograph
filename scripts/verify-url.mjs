// URL 参数全流程验证
import { chromium } from 'playwright-core';

const EDGE = '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
const browser = await chromium.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});

// 1) 带完整 query 打开
const URL = 'http://localhost:5273/?ring=144&rolling=60&mode=inside&pen=40,3a86ff,1.8&pen=70,00bbf9,1.5&pen=90,d9a404,1.5&bg=1b1b2f&speed=2.5&scale=fixed';
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

const loaded = await page.evaluate(() => {
  const s = window.__dshStore.getState();
  return {
    ring: s.ringTeeth, rolling: s.rollingTeeth, mode: s.mode,
    pens: s.pens.map(p => p.hole + ',' + p.color + ',' + p.width),
    bg: s.background, speed: s.speed, scale: s.scaleMode,
    penCards: document.querySelectorAll('.pen-card').length,
    renderScale: window.__dshRender.transform.scale,
  };
});
console.log('1) URL 加载:', JSON.stringify(loaded));

// 2) 修改参数 → 地址栏自动更新
await page.evaluate(() => {
  document.querySelector('#mode-seg button[data-mode="outside"]').click();
  const s = document.querySelectorAll('.pen-card')[0].querySelector('.pen-hole');
  s.value = '55'; s.dispatchEvent(new Event('input'));
});
await page.waitForTimeout(600); // 等防抖 150ms
const urlAfterChange = await page.evaluate(() => location.search);
console.log('2) 修改后 URL:', urlAfterChange);
const ok2 = urlAfterChange.includes('mode=outside') && urlAfterChange.includes('pen=55,3a86ff,1.8');
console.log('   → mode=outside ✓:', urlAfterChange.includes('mode=outside'), '| pen=55 ✓:', urlAfterChange.includes('pen=55,3a86ff,1.8'));

// 3) 添加笔 → URL 更新（4 支笔）
await page.click('#add-pen');
await page.waitForTimeout(600);
const penCount = await page.evaluate(() => new URLSearchParams(location.search).getAll('pen').length);
console.log('3) 加笔后 URL 中 pen 数量:', penCount, penCount === 4 ? '✅' : '⚠');

// 4) 刷新 → 状态保持
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(800);
const afterReload = await page.evaluate(() => {
  const s = window.__dshStore.getState();
  return { mode: s.mode, pens: s.pens.map(p => p.hole), scale: s.scaleMode, bg: s.background, speed: s.speed };
});
console.log('4) 刷新后:', JSON.stringify(afterReload));
console.log('   → 状态保持:', afterReload.mode === 'outside' && afterReload.pens.length === 4 && afterReload.scale === 'fixed' ? '✅' : '⚠');

// 5) 非法参数 → 默认兜底
const badPage = await browser.newPage();
await badPage.goto('http://localhost:5273/?ring=abc&rolling=999&mode=sideways&pen=bad&bg=xyz&scale=foo', { waitUntil: 'networkidle' });
await badPage.waitForTimeout(600);
const badState = await badPage.evaluate(() => {
  const s = window.__dshStore.getState();
  return { ring: s.ringTeeth, rolling: s.rollingTeeth, mode: s.mode, pens: s.pens.length, bg: s.background, scale: s.scaleMode };
});
console.log('5) 非法参数:', JSON.stringify(badState));
console.log('   → 全部回退默认:', badState.ring === 72 && badState.mode === 'inside' && badState.pens === 2 ? '✅' : '⚠');

// 6) 内切 rolling >= ring → 夹取
const clampPage = await browser.newPage();
await clampPage.goto('http://localhost:5273/?ring=50&rolling=80&mode=inside', { waitUntil: 'networkidle' });
await clampPage.waitForTimeout(600);
const clampState = await clampPage.evaluate(() => {
  const s = window.__dshStore.getState();
  return { rolling: s.rollingTeeth, ring: s.ringTeeth };
});
console.log('6) 内切 rolling≥ring 夹取:', JSON.stringify(clampState), clampState.rolling === 49 ? '✅' : '⚠');

console.log('JS错误:', errors.length ? errors : '无');
await browser.close();
