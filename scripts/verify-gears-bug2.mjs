// Comprehensive reproduction of the user path
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
  console.log(label, '-> non-background pixels:', n, n > 2000 ? 'OK' : 'FAIL blank!', errs.length ? '| errors: ' + errs.join('; ') : '');
};

// path 1: default + Show Gears + play
{
  const { p, errs } = await newPage('http://localhost:5273/');
  await p.evaluate(() => document.getElementById('show-gears').click());
  await p.waitForTimeout(300);
  await p.click('#play');
  await p.waitForTimeout(1200);
  check('path1 default+gears+play', await nonBg(p), errs);
  await p.close();
}

// path 2: Spiderweb preset + Show Gears + play
{
  const { p, errs } = await newPage('http://localhost:5273/');
  await p.evaluate(() => [...document.querySelectorAll('#preset-chips .chip')].find((c) => c.textContent.includes('Spiderweb')).click());
  await p.waitForTimeout(400);
  await p.evaluate(() => document.getElementById('show-gears').click());
  await p.waitForTimeout(300);
  await p.click('#play');
  await p.waitForTimeout(1200);
  check('path2 Spiderweb preset+gears+play', await nonBg(p), errs);
  await p.close();
}

// path 3: outside mode + Show Gears + play
{
  const { p, errs } = await newPage('http://localhost:5273/?mode=outside');
  await p.evaluate(() => document.getElementById('show-gears').click());
  await p.waitForTimeout(300);
  await p.click('#play');
  await p.waitForTimeout(1200);
  check('path3 outside+gears+play', await nonBg(p), errs);
  await p.close();
}

// path 4: fixed mode + Show Gears + play
{
  const { p, errs } = await newPage('http://localhost:5273/?scale=fixed&gears=1');
  await p.click('#play');
  await p.waitForTimeout(1200);
  check('path4 fixed+gears(URL)+play', await nonBg(p), errs);
  await p.close();
}

// path 5: toggle Show Gears while playing
{
  const { p, errs } = await newPage('http://localhost:5273/');
  await p.click('#play');
  await p.waitForTimeout(400);
  await p.evaluate(() => document.getElementById('show-gears').click()); // toggle while playing -> animation should stop
  await p.waitForTimeout(300);
  const btn1 = await p.textContent('#play');
  await p.click('#play'); // replay
  await p.waitForTimeout(1000);
  check('path5 toggle-while-playing then replay (' + btn1 + ' ->)', await nonBg(p), errs);
  await p.close();
}

// path 6: large tooth count auto + gears
{
  const { p, errs } = await newPage('http://localhost:5273/?ring=240&rolling=239&gears=1');
  await p.click('#play');
  await p.waitForTimeout(1200);
  check('path6 large teeth 240×239+gears+play', await nonBg(p), errs);
  await p.close();
}

console.log('all paths done');
await browser.close();
