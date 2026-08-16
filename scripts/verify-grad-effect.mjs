import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
const EDGE = '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
const browser = await chromium.launch({ executablePath: EDGE, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

// 4 色 + 间隔 10：0/10/20/30/40 环形
const URL = 'http://localhost:5273/?ring=72&rolling=30&pen=40,e63946,2.5,10,1d6fa5,f4a261,2a9d8f&scale=fixed';
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

// 画布颜色分布：应出现 红/蓝/橙/绿 + 中间过渡
const colors = await page.evaluate(() => {
  const c = document.getElementById('canvas');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let red=0, blue=0, orange=0, green=0;
  for (let i = 0; i < d.length; i += 8) {
    const r=d[i], g=d[i+1], b=d[i+2];
    if (r>240&&g>240&&b>240) continue;
    if (r>180&&g<100) red++;            // 红 #e63946
    else if (r<80&&g>120&&b>140) blue++; // 蓝 #1d6fa5
    else if (r>180&&g>140&&b<100) orange++; // 橙 #f4a261
    else if (g>140&&r<100&&b<110) green++; // 绿 #2a9d8f
  }
  return { red, blue, orange, green };
});
console.log('画布颜色分布:', JSON.stringify(colors), '(4 色都应 >100 才算渐变生效)');
console.log(colors.red>100&&colors.blue>100&&colors.orange>100&&colors.green>100 ? '✅ 渐变生效' : '⚠ ');

// 截图
const shot = await page.locator('#canvas').screenshot();
writeFileSync('scripts/preview-gradient.png', shot);
console.log('预览图: scripts/preview-gradient.png');
console.log('JS错误:', errors.length ? errors : '无');

// 间隔点验证：曲线起点(0位)是红
const state = await page.evaluate(() => {
  const p = window.__dshStore.getState().pens[0];
  return { gradient: p.gradient, spacing: p.gradientSpacing };
});
console.log('状态:', JSON.stringify(state));
await browser.close();
