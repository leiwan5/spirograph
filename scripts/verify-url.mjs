// Full flow verification of URL parameters
import { chromium } from 'playwright-core';

const EDGE = '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
const browser = await chromium.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});

// 1) open with full query
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
console.log('1) URL load:', JSON.stringify(loaded));

// 2) modify params → address bar auto-updates
await page.evaluate(() => {
  document.querySelector('#mode-seg button[data-mode="outside"]').click();
  const s = document.querySelectorAll('.pen-card')[0].querySelector('.pen-hole');
  s.value = '55'; s.dispatchEvent(new Event('input'));
});
await page.waitForTimeout(600); // wait for 150ms debounce
const urlAfterChange = await page.evaluate(() => location.search);
console.log('2) URL after change:', urlAfterChange);
const ok2 = urlAfterChange.includes('mode=outside') && urlAfterChange.includes('pen=55,3a86ff,1.8');
console.log('   → mode=outside ✓:', urlAfterChange.includes('mode=outside'), '| pen=55 ✓:', urlAfterChange.includes('pen=55,3a86ff,1.8'));

// 3) add pen → URL updates (4 pens)
await page.click('#add-pen');
await page.waitForTimeout(600);
const penCount = await page.evaluate(() => new URLSearchParams(location.search).getAll('pen').length);
console.log('3) pen count in URL after adding:', penCount, penCount === 4 ? '✅' : '⚠');

// 4) refresh → state persists
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(800);
const afterReload = await page.evaluate(() => {
  const s = window.__dshStore.getState();
  return { mode: s.mode, pens: s.pens.map(p => p.hole), scale: s.scaleMode, bg: s.background, speed: s.speed };
});
console.log('4) after refresh:', JSON.stringify(afterReload));
console.log('   → state persists:', afterReload.mode === 'outside' && afterReload.pens.length === 4 && afterReload.scale === 'fixed' ? '✅' : '⚠');

// 5) invalid params → default fallback
const badPage = await browser.newPage();
await badPage.goto('http://localhost:5273/?ring=abc&rolling=999&mode=sideways&pen=bad&bg=xyz&scale=foo', { waitUntil: 'networkidle' });
await badPage.waitForTimeout(600);
const badState = await badPage.evaluate(() => {
  const s = window.__dshStore.getState();
  return { ring: s.ringTeeth, rolling: s.rollingTeeth, mode: s.mode, pens: s.pens.length, bg: s.background, scale: s.scaleMode };
});
console.log('5) invalid params:', JSON.stringify(badState));
console.log('   → all fall back to defaults:', badState.ring === 72 && badState.mode === 'inside' && badState.pens === 2 ? '✅' : '⚠');

// 6) inside rolling >= ring → clamped
const clampPage = await browser.newPage();
await clampPage.goto('http://localhost:5273/?ring=50&rolling=80&mode=inside', { waitUntil: 'networkidle' });
await clampPage.waitForTimeout(600);
const clampState = await clampPage.evaluate(() => {
  const s = window.__dshStore.getState();
  return { rolling: s.rollingTeeth, ring: s.ringTeeth };
});
console.log('6) inside rolling>=ring clamped:', JSON.stringify(clampState), clampState.rolling === 49 ? '✅' : '⚠');

console.log('JS errors:', errors.length ? errors : 'none');
await browser.close();
