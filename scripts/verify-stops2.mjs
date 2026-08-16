import { chromium } from 'playwright-core';
const EDGE = '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
const browser = await chromium.launch({ executablePath: EDGE, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();
await page.goto('http://localhost:5273/?ring=72&rolling=30&pen=40,e63946,2.5,10,1d6fa5,f4a261,2a9d8f', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);

const r = await page.evaluate(async () => {
  const ren = await import('/src/render/renderer.ts');
  const colors = ['#e63946', '#1d6fa5', '#f4a261', '#2a9d8f']; // 红蓝橙绿
  const sp = 10;
  const probe = (p) => { // p 为位置 %
    const t = p / 100;
    return { at: p, color: ren.gradientColorAt(colors, t, sp), want: null };
  };
  // 间隔点：0/10/20/30/40 依次为 红/蓝/橙/绿/红(循环)
  const points = [0, 10, 20, 30, 40, 50].map((p) => {
    const c = ren.gradientColorAt(colors, p / 100, sp);
    return { p, c };
  });
  // 段内中点：5 → 红蓝过渡中点
  const mid5 = ren.gradientColorAt(colors, 0.05, sp);
  const mid15 = ren.gradientColorAt(colors, 0.15, sp);
  return { points, mid5, mid15 };
});
const hex = (rgb) => {
  // 'rgb(r,g,b)' → 判断大致
  return rgb;
};
console.log('间隔点颜色 (期望 0红/10蓝/20橙/30绿/40红/50蓝):');
r.points.forEach(p => console.log('  ' + p.p + '%: ' + p.c));
console.log('段内中点: 5% ->', r.mid5, '(红蓝过渡) | 15% ->', r.mid15, '(蓝橙过渡)');
// 校验
const expectAt = ['红','蓝','橙','绿','红','蓝'];
const classify = (c) => {
  const m = c.match(/rgb\((\d+),(\d+),(\d+)\)/);
  if (m) {
    const rr=+m[1], g=+m[2], b=+m[3];
    if (rr>200&&g<120) return 'red';
    if (b>160&&rr<80) return 'blue';
    if (rr>180&&g>140&&b<110) return 'orange';
    if (g>140&&rr<100) return 'green';
    if (rr<30&&g<30&&b<30) return 'black';
    return 'transition';
  }
  return c;
};
console.log('间隔点判定:', r.points.map(p => classify(p.c)).join(', '));
const ok = r.points.map(p => classify(p.c));
console.log('期望: red, blue, orange, green, red, blue');
console.log(ok[0]==='red'&&ok[1]==='blue'&&ok[2]==='orange'&&ok[3]==='green'&&ok[4]==='red'&&ok[5]==='blue' ? '✅ 间隔点颜色序列正确' : '⚠');
await browser.close();
