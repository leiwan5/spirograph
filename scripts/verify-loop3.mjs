import { chromium } from 'playwright-core';
const EDGE = '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
const browser = await chromium.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

async function analyze(url) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  return page.evaluate(() => {
    const c = document.getElementById('canvas');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let red = 0, blue = 0, total = 0;
    for (let i = 0; i < d.length; i += 16) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      if (r > 240 && g > 240 && b > 240) continue;
      total++;
      if (r > 180 && r - b > 80 && r - g > 80) red++;          // #e63946 系
      else if (b > 130 && b - r > 80 && g > 70 && g < 150) blue++; // #1d6fa5 系
    }
    return { red, blue, total };
  });
}

// 循环：起点20 长度30 → 每 30% 一个周期（红→蓝→红→蓝…）→ 蓝应显著多于不循环？不：循环中蓝占比 = 周期内偏蓝段
const loop = await analyze('http://localhost:5273/?ring=72&rolling=30&pen=40,e63946,2.5,20,30,1,1d6fa5');
console.log('循环(20,30): 红', loop.red, '| 蓝', loop.blue, '| 总', loop.total);

// 不循环：起点20 长度30 → 50% 后段纯蓝
const plain = await analyze('http://localhost:5273/?ring=72&rolling=30&pen=40,e63946,2.5,20,30,1d6fa5');
console.log('不循环(20,30): 红', plain.red, '| 蓝', plain.blue, '| 总', plain.total);

// 对比：循环 vs 不循环，循环的蓝段应分散（多周期），不循环的蓝集中在后段；
// 直接验证：循环时"蓝像素比例"显著低于不循环（因为循环蓝只占周期的一部分且周期短）
console.log('结论:');
console.log('  循环: 蓝占比', (loop.blue / loop.total * 100).toFixed(1) + '%', loop.blue > 100 ? '✅ 有多周期蓝色' : '⚠');
console.log('  不循环: 蓝占比', (plain.blue / plain.total * 100).toFixed(1) + '%', plain.blue > 500 ? '✅ 后段大量纯蓝' : '⚠');
console.log('  差异确认:', loop.blue < plain.blue * 0.9 && loop.blue > 50 ? '✅ 循环与不循环行为不同（循环蓝分散、不循环蓝集中）' : '⚠ 差异不明显');
await browser.close();
