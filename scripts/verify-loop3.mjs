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
      if (r > 180 && r - b > 80 && r - g > 80) red++;          // #e63946 family
      else if (b > 130 && b - r > 80 && g > 70 && g < 150) blue++; // #1d6fa5 family
    }
    return { red, blue, total };
  });
}

// loop: start 20 length 30 -> one cycle per 30% (red→blue→red→blue...) -> blue should notably exceed non-loop? No: in the loop, blue's share = the bluish segment within the cycle
const loop = await analyze('http://localhost:5273/?ring=72&rolling=30&pen=40,e63946,2.5,20,30,1,1d6fa5');
console.log('loop(20,30): red', loop.red, '| blue', loop.blue, '| total', loop.total);

// non-loop: start 20 length 30 -> second 50% is pure blue
const plain = await analyze('http://localhost:5273/?ring=72&rolling=30&pen=40,e63946,2.5,20,30,1d6fa5');
console.log('non-loop(20,30): red', plain.red, '| blue', plain.blue, '| total', plain.total);

// comparison: loop vs non-loop; the loop's blue segments should be spread out (multi-cycle), the non-loop's blue concentrated in the second half;
// direct check: with the loop, the "blue pixel share" is notably lower than the non-loop (because the loop's blue occupies only part of a short cycle)
console.log('conclusion:');
console.log('  loop: blue share', (loop.blue / loop.total * 100).toFixed(1) + '%', loop.blue > 100 ? '✅ has multi-cycle blue' : '⚠');
console.log('  non-loop: blue share', (plain.blue / plain.total * 100).toFixed(1) + '%', plain.blue > 500 ? '✅ large pure-blue second half' : '⚠');
console.log('  difference confirmed:', loop.blue < plain.blue * 0.9 && loop.blue > 50 ? '✅ loop and non-loop behave differently (loop blue spread out, non-loop blue concentrated)' : '⚠ difference not obvious');
await browser.close();
