// 90° 方向径向扫描：380-400px 逐像素，看齿形结构
import { chromium } from 'playwright-core';
const EDGE = '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
const browser = await chromium.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto('http://localhost:5273/?ring=72&rolling=30&pen=40,e63946,2.5&pen=75,1d6fa5,2&scale=fixed&gears=1', { waitUntil: 'networkidle' });
await page.waitForTimeout(700);

const scan = await page.evaluate(() => {
  const c = document.getElementById('canvas');
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;
  const img = ctx.getImageData(0, 0, W, H).data;
  const cx = W / 2, cy = H / 2;
  const px = (x, y) => {
    const i = (Math.round(y) * W + Math.round(x)) * 4;
    return [img[i], img[i + 1], img[i + 2]];
  };
  const rows = [];
  for (const deg of [90, 92, 94, 96, 98]) {
    const a = (deg * Math.PI) / 180;
    const row = [];
    for (let rad = 380; rad <= 400; rad += 1) {
      const p = px(cx + rad * Math.cos(a), cy + rad * Math.sin(a));
      row.push(rad + ':' + p.join(','));
    }
    rows.push({ deg, row });
  }
  return rows;
});
for (const s of scan) {
  console.log(s.deg + '°: ' + s.row.map(x => x.split(':')[1]).join(' | '));
}
await browser.close();
