import { chromium } from 'playwright-core';
const EDGE = '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
const browser = await chromium.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const GRAD = 'ring=72&rolling=30&pen=40,e63946,2.5,20,40,1d6fa5'; // 起点20 长度40 不循环
await page.goto('http://localhost:5273/?' + GRAD, { waitUntil: 'networkidle' });
await page.waitForTimeout(600);

// 页面内统一分析函数：给定图片 src（同源 URL），返回指定进度位置的颜色
async function sampleColors(src) {
  return page.evaluate(async (url) => {
    const resp = await fetch(url);
    const blob = await resp.blob();
    const dataUrl = await new Promise((res) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.readAsDataURL(blob);
    });
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const cv = document.createElement('canvas');
        cv.width = img.naturalWidth; cv.height = img.naturalHeight;
        const ctx = cv.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
        // 统计渐变曲线上的颜色分布（排除背景）：中段（插值区）应有非黑非白颜色
        let midColors = 0, black = 0, total = 0;
        const seen = new Set();
        for (let i = 0; i < d.length; i += 16) {
          const r = d[i], g = d[i + 1], b = d[i + 2];
          if (r > 240 && g > 240 && b > 240) continue;
          total++;
          if (r < 20 && g < 20 && b < 20) black++;
          else seen.add((r >> 3) + ',' + (g >> 3) + ',' + (b >> 3));
        }
        midColors = seen.size;
        resolve({ total, black, distinct: midColors });
      };
      img.src = dataUrl;
    });
  }, src);
}

// 屏幕渲染的颜色统计（同样方法）
const screen = await page.evaluate(() => {
  const c = document.getElementById('canvas');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let black = 0, total = 0;
  const seen = new Set();
  for (let i = 0; i < d.length; i += 16) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    if (r > 240 && g > 240 && b > 240) continue;
    total++;
    if (r < 20 && g < 20 && b < 20) black++;
    else seen.add((r >> 3) + ',' + (g >> 3) + ',' + (b >> 3));
  }
  return { total, black, distinct: seen.size };
});

const apiPng = await sampleColors('/api/image?' + GRAD + '&format=png&size=512');
const apiSvg = await sampleColors('/api/image?' + GRAD + '&format=svg&size=512');

console.log('屏幕渲染:    黑色', screen.black, '| 去重颜色', screen.distinct, '| 总', screen.total);
console.log('/api PNG:     黑色', apiPng.black, '| 去重颜色', apiPng.distinct, '| 总', apiPng.total);
console.log('/api SVG:     黑色', apiSvg.black, '| 去重颜色', apiSvg.distinct, '| 总', apiSvg.total);
console.log('判定:');
console.log('  NaN 黑像素已修复:', apiPng.black === 0 && apiSvg.black === 0 ? '✅ 无黑色（之前插值段全黑）' : '⚠ 仍有黑');
console.log('  渐变颜色丰富:', screen.distinct > 10 && apiPng.distinct > 10 && apiSvg.distinct > 10 ? '✅ 各路径都有渐变' : '⚠');
await browser.close();
