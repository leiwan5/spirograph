import { chromium } from 'playwright-core';
const EDGE = '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
const browser = await chromium.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});
const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
const page = await context.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://localhost:5273/?ring=96&rolling=63&pen=35,f15bb5,2.5&pen=65,9b5de5,2&scale=fixed', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);

// 点击复制按钮
await page.click('#copy-image-link');
await page.waitForTimeout(400);
const copied = await page.evaluate(() => navigator.clipboard.readText());
console.log('剪贴板内容:', copied);
const ok = copied.startsWith('http://localhost:5273/api/image?') && copied.includes('format=png') && copied.includes('ring=96') && copied.includes('pen=35%2Cf15bb5%2C2.5');
console.log('URL 结构:', ok ? '✅ 含 /api/image + format=png + 全部参数' : '⚠ ' + copied);

// 按钮反馈
const btnText = await page.textContent('#copy-image-link');
console.log('按钮反馈:', btnText, btnText.includes('已复制') ? '✅' : '⚠');

// 复制的 URL 可加载图片
const imgOk = await page.evaluate(async (url) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ ok: true, w: img.naturalWidth });
    img.onerror = () => resolve({ ok: false });
    img.src = url;
  });
}, copied);
console.log('复制的链接可显示图片:', imgOk.ok ? '✅ ' + imgOk.w + 'px' : '❌');
console.log('JS错误:', errors.length ? errors : '无');
await browser.close();
