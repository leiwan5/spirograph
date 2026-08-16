import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
const EDGE = '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
const browser = await chromium.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto('http://localhost:5273/?ring=72&rolling=30&pen=40,e63946,2.5&pen=75,1d6fa5,2&scale=fixed&gears=1', { waitUntil: 'networkidle' });
await page.waitForTimeout(700);

// 静态帧
const shot1 = await page.locator('#canvas').screenshot();
writeFileSync('scripts/shot-static.png', shot1);
console.log('静态截图已保存 shot-static.png');

// 播放一帧（动画中）
await page.evaluate(() => {
  document.getElementById('speed').value = '0.5';
  document.getElementById('speed').dispatchEvent(new Event('input'));
});
await page.click('#play');
await page.waitForTimeout(1800); // 动画中段（速度0.5，第一支笔约 30s/2=15s 段，此刻 ~12% 在笔一）
const shot2 = await page.locator('#canvas').screenshot();
writeFileSync('scripts/shot-anim.png', shot2);
console.log('动画帧截图已保存 shot-anim.png');
await page.click('#play');
await browser.close();
