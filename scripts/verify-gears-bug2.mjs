// 全面复现用户路径
import { chromium } from 'playwright-core';

const EDGE = '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
const browser = await chromium.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

async function newPage(url) {
  const p = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });
  await p.goto(url, { waitUntil: 'networkidle' });
  await p.waitForTimeout(600);
  return { p, errs };
}

async function nonBg(p) {
  return p.evaluate(() => {
    const c = document.getElementById('canvas');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (!(d[i] === 255 && d[i + 1] === 255 && d[i + 2] === 255)) n++;
    }
    return n;
  });
}
const check = (label, n, errs) => {
  console.log(label, '→ 非背景像素:', n, n > 2000 ? '✅' : '❌ 空白!', errs.length ? '| 错误: ' + errs.join('; ') : '');
};

// 路径1：默认 + 勾选齿轮 + 播放
{
  const { p, errs } = await newPage('http://localhost:5273/');
  await p.evaluate(() => document.getElementById('show-gears').click());
  await p.waitForTimeout(300);
  await p.click('#play');
  await p.waitForTimeout(1200);
  check('路径1 默认+齿轮+播放', await nonBg(p), errs);
  await p.close();
}

// 路径2：预设蛛网 + 勾选齿轮 + 播放
{
  const { p, errs } = await newPage('http://localhost:5273/');
  await p.evaluate(() => [...document.querySelectorAll('#preset-chips .chip')].find((c) => c.textContent.includes('蛛网')).click());
  await p.waitForTimeout(400);
  await p.evaluate(() => document.getElementById('show-gears').click());
  await p.waitForTimeout(300);
  await p.click('#play');
  await p.waitForTimeout(1200);
  check('路径2 预设蛛网+齿轮+播放', await nonBg(p), errs);
  await p.close();
}

// 路径3：外切模式 + 勾选齿轮 + 播放
{
  const { p, errs } = await newPage('http://localhost:5273/?mode=outside');
  await p.evaluate(() => document.getElementById('show-gears').click());
  await p.waitForTimeout(300);
  await p.click('#play');
  await p.waitForTimeout(1200);
  check('路径3 外切+齿轮+播放', await nonBg(p), errs);
  await p.close();
}

// 路径4：fixed 模式 + 勾选齿轮 + 播放
{
  const { p, errs } = await newPage('http://localhost:5273/?scale=fixed&gears=1');
  await p.click('#play');
  await p.waitForTimeout(1200);
  check('路径4 fixed+齿轮(URL)+播放', await nonBg(p), errs);
  await p.close();
}

// 路径5：播放中勾选齿轮
{
  const { p, errs } = await newPage('http://localhost:5273/');
  await p.click('#play');
  await p.waitForTimeout(400);
  await p.evaluate(() => document.getElementById('show-gears').click()); // 播放中勾选 → 应停止动画
  await p.waitForTimeout(300);
  const btn1 = await p.textContent('#play');
  await p.click('#play'); // 重新播放
  await p.waitForTimeout(1000);
  check('路径5 播放中勾选后重播 (' + btn1 + ' →)', await nonBg(p), errs);
  await p.close();
}

// 路径6：大齿数 auto + 齿轮
{
  const { p, errs } = await newPage('http://localhost:5273/?ring=240&rolling=239&gears=1');
  await p.click('#play');
  await p.waitForTimeout(1200);
  check('路径6 大齿数240×239+齿轮+播放', await nonBg(p), errs);
  await p.close();
}

console.log('全部路径完成');
await browser.close();
