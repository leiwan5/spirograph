// 解压 PNG 检查像素内容
import { inflate } from 'pako';
import { readFileSync } from 'node:fs';

const buf = readFileSync('/tmp/a.png');
let idat = [];
let off = 8;
while (off < buf.length) {
  const len = buf.readUInt32BE(off);
  const type = buf.toString('ascii', off + 4, off + 8);
  if (type === 'IDAT') idat.push(buf.subarray(off + 8, off + 8 + len));
  if (type === 'IEND') break;
  off += 12 + len;
}
const raw = inflate(Buffer.concat(idat));
const w = 1000;
const stride = w * 4 + 1;
const row = 500;
const base = row * stride + 1;
const px = (x) => [raw[base + x * 4], raw[base + x * 4 + 1], raw[base + x * 4 + 2]];
console.log('中心行采样: x=100:', px(100).join(','), '| x=500:', px(500).join(','), '| x=900:', px(900).join(','));
let red = 0, nonWhite = 0;
for (let i = 0; i < raw.length; i += 4) {
  const r = raw[i], g = raw[i + 1], b = raw[i + 2];
  if (r > 180 && g < 130 && b < 130) red++;
  if (!(r === 255 && g === 255 && b === 255)) nonWhite++;
}
console.log('红色像素:', red, '| 非白像素:', nonWhite);
console.log(red > 3000 ? '曲线已绘制 ✅' : '曲线缺失 ⚠');
