// 验证后台 API 探测：带后端（vite preview 中间件）→ 显示链接按钮；纯静态 → 隐藏
import { chromium } from 'playwright-core';
const EDGE = '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
const browser = await chromium.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});

async function check(url, label) {
  const context = await browser.newContext();
  const page = await context.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url, { waitUntil: 'networkidle' });
  // 等待探测完成（默认 6s 超时，正常场景瞬时完成）
  await page.waitForTimeout(1200);
  const visible = await page.evaluate(() => {
    const btn = document.querySelector('#copy-image-link');
    return btn ? !btn.hidden && btn.offsetParent !== null : false;
  });
  console.log(`${label}: 链接按钮${visible ? '✅ 显示' : '❌ 隐藏'}`);
  console.log(`  JS错误: ${errors.length ? errors : '无'}`);
  await context.close();
  return visible;
}

const withBackend = await check('http://localhost:5273/?ring=96&rolling=63&pen=35,f15bb5,2.5&scale=fixed', '[带后端 vite preview]');
const noBackend = await check('http://localhost:5274/?ring=96&rolling=63&pen=35,f15bb5,2.5&scale=fixed', '[纯静态 http.server]');

await browser.close();
console.log('\n结果:', withBackend && !noBackend ? '✅ 全部符合预期' : '⚠ 与预期不符');