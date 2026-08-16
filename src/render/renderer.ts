import type { Bounds, CurveData, DrawingMode, Pen, Transform } from '../types';
import { meshPhase } from '../math/gear';

/** 计算一组曲线的联合包围盒 */
export function computeBounds(curves: Array<{ points: Float64Array; count: number }>): Bounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const c of curves) {
    for (let i = 0; i < c.count; i++) {
      const x = c.points[2 * i];
      const y = c.points[2 * i + 1];
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  return { minX, minY, maxX, maxY };
}

/**
 * 环固定模式的包围盒：只由齿轮环几何决定，与孔洞完全无关。
 * - 内切：以环形齿轮半径 R 为界（孔洞 ≤100% 时图案始终在环内），
 *   环在画布上的像素大小恒定，不随齿轮规格与孔洞变化。
 * - 外切：以最大图案半径 R + 2r 为界（孔洞 ≤100% 时图案永不超界）。
 * 调整任一笔的孔洞不会改变整图缩放/位置。
 */
export function computeFixedBounds(ringTeeth: number, rollingTeeth: number, mode: DrawingMode): Bounds {
  const maxR = mode === 'inside' ? ringTeeth : ringTeeth + rollingTeeth * 2;
  return { minX: -maxR, minY: -maxR, maxX: maxR, maxY: maxR };
}

/** 计算曲线坐标 → 画布像素坐标的均匀缩放变换（居中） */
export function computeTransform(bounds: Bounds, width: number, height: number, padding: number): Transform {
  const bw = bounds.maxX - bounds.minX;
  const bh = bounds.maxY - bounds.minY;
  if (bw <= 0 && bh <= 0) {
    return { scale: 1, offsetX: width / 2 - bounds.minX, offsetY: height / 2 - bounds.minY };
  }
  const scale = Math.min((width - padding * 2) / (bw || 1), (height - padding * 2) / (bh || 1));
  const offsetX = (width - bw * scale) / 2 - bounds.minX * scale;
  const offsetY = (height - bh * scale) / 2 - bounds.minY * scale;
  return { scale, offsetX, offsetY };
}

export function applyTransform(t: Transform, x: number, y: number): [number, number] {
  return [x * t.scale + t.offsetX, y * t.scale + t.offsetY];
}

/** 清空画布并绘制背景 */
export function clearCanvas(canvas: HTMLCanvasElement, width: number, height: number, background: string): CanvasRenderingContext2D {
  const dpr = window.devicePixelRatio || 1;
  if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
  }
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(dpr, dpr);
  return ctx;
}

export interface RenderItem {
  curve: CurveData;
  pen: Pen;
}

/**
 * 渲染完整图案。所有曲线按笔顺序叠加。
 * lineCap/lineJoin 用 round 保证平滑衔接。
 */
export function renderFull(
  ctx: CanvasRenderingContext2D,
  items: RenderItem[],
  transform: Transform,
): void {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const item of items) {
    const { points, count } = item.curve;
    ctx.strokeStyle = item.pen.color;
    ctx.lineWidth = item.pen.width; // 屏幕像素：变换为均匀缩放，直接绘制即可
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      const [sx, sy] = applyTransform(transform, points[2 * i], points[2 * i + 1]);
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * 渲染动画进度：每支笔按各自总点数比例同步推进（模拟多笔同时绘制）。
 */
export function renderPartial(
  ctx: CanvasRenderingContext2D,
  items: RenderItem[],
  transform: Transform,
  progress: number,
): void {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const item of items) {
    const { points, count } = item.curve;
    const drawn = Math.max(1, Math.floor(progress * count));
    ctx.strokeStyle = item.pen.color;
    ctx.lineWidth = item.pen.width;
    ctx.beginPath();
    for (let i = 0; i < drawn; i++) {
      const [sx, sy] = applyTransform(transform, points[2 * i], points[2 * i + 1]);
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** 孔阵孔半径（px）：基于节圆半径 r 与缩放，与笔孔真实位置（hole%·r）一致 */
export function gearHoleRadius(transform: Transform, rollingTeeth: number): number {
  return Math.max(1.2, 0.035 * rollingTeeth * transform.scale);
}

/** 孔阵中的一个孔（盘面局部坐标：frac = 半径比例，angle = 局部角） */
export interface HolePatternHole {
  frac: number;
  angle: number;
}

/** 确定性随机数（基于笔参数种子，同一组参数 → 同一孔阵） */
function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * 根据笔参数生成盘面孔阵：
 * - 每支笔的参数半径（hole%·r）处有一圈孔，0 号孔在局部角 0（与曲线起点严格重合）
 *   → 所有笔的孔都是孔阵的一员，笔尖插在孔正中间
 * - 再确定性随机补充若干圈装饰孔，使盘面像真实万花尺的钻孔布局
 */
export function generateHolePattern(pens: Array<{ hole: number }>): HolePatternHole[] {
  const seed = pens.reduce((h, p) => h * 31 + Math.round(p.hole), 7) >>> 0;
  const rnd = seededRandom(seed);
  const holes: HolePatternHole[] = [];
  const usedFracs = new Set<number>();

  // 笔参数圈：0 号孔在局部角 0
  for (const pen of pens) {
    const frac = Math.max(0.08, pen.hole / 100);
    if (usedFracs.has(frac)) continue;
    for (let k = 0; k < 8; k++) {
      holes.push({ frac, angle: (k / 8) * Math.PI * 2 });
    }
    usedFracs.add(frac);
  }

  // 补充圈（装饰，随机半径与孔数，避免与已有圈过近）
  const target = Math.min(5, usedFracs.size + 2);
  let guard = 0;
  while (usedFracs.size < target && guard++ < 30) {
    const frac = 0.12 + rnd() * 0.76;
    if ([...usedFracs].some((f) => Math.abs(f - frac) < 0.14)) continue;
    const n = 7 + Math.floor(rnd() * 3);
    const offset = rnd() * ((Math.PI * 2) / n);
    for (let k = 0; k < n; k++) {
      holes.push({ frac, angle: offset + (k / n) * Math.PI * 2 });
    }
    usedFracs.add(frac);
  }
  return holes;
}

/** 齿轮位姿：滚动中心方向角 + 滚动齿轮自转角 */
export interface GearPose {
  centerAngle: number;
  spinAngle: number;
}

/**
 * 计算滚动齿轮在参数 t 时刻的位姿（纯滚动，曲线坐标单位 = 齿数）。
 * 内切：中心在半径 (R−r) 圆上，自转角 = −(R−r)/r·t + 啮合相位（齿尖对准环齿谷）
 * 外切：中心在半径 (R+r) 圆上，自转角 = (R+r)/r·t + π
 */
export function computeGearPose(ringTeeth: number, rollingTeeth: number, mode: DrawingMode, t: number): GearPose {
  const k = mode === 'inside' ? (ringTeeth - rollingTeeth) / rollingTeeth : (ringTeeth + rollingTeeth) / rollingTeeth;
  return {
    centerAngle: t,
    spinAngle: mode === 'inside' ? -k * t + meshPhase(ringTeeth, rollingTeeth) : k * t + Math.PI,
  };
}

/** 多笔分步进度：总进度 [0,1] → 当前笔索引 + 该笔内进度 [0,1] */
export function computeSteps(penCount: number, totalProgress: number): { penIndex: number; penProgress: number } {
  const n = Math.max(1, penCount);
  const seg = 1 / n;
  const idx = Math.min(n - 1, Math.floor(totalProgress * n));
  const local = Math.min(1, (totalProgress - idx * seg) / seg);
  return { penIndex: idx, penProgress: local };
}

/**
 * 绘制齿轮系统（画在曲线之下），真实万花尺外观 + 淡色半透明：
 * - 环形齿轮：平滑外缘 + 内侧一圈平顶小齿（内齿圈，静止）
 * - 滚动齿轮：外齿圆盘（齿朝外），盘面有装饰孔圈与中心孔，随动画滚动/自转
 * 盘面孔阵由笔参数确定性随机生成（generateHolePattern），笔孔与笔尖由
 * drawPenHoles 单独绘制（应画在曲线之上）。
 */
export function drawGears(
  ctx: CanvasRenderingContext2D,
  transform: Transform,
  ringTeeth: number,
  rollingTeeth: number,
  mode: DrawingMode,
  t: number,
  pens: Pen[],
): void {
  const { scale, offsetX, offsetY } = transform;
  const R = ringTeeth;
  const r = rollingTeeth;
  const centerR = mode === 'inside' ? R - r : R + r;
  const pose = computeGearPose(R, r, mode, t);
  const toothH = 7 / scale; // 齿深（7px）
  const PI2 = Math.PI * 2;
  const fill = 'rgba(150,162,182,0.14)'; // 盘体淡色
  const toothFill = 'rgba(118,132,152,0.42)'; // 齿（比盘体深，齿形清晰）
  const stroke = 'rgba(104,119,140,0.7)'; // 轮廓/齿形描边
  const strokeSoft = 'rgba(130,144,164,0.35)'; // 次要轮廓
  const holeStroke = 'rgba(118,132,152,0.55)'; // 孔

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 1.4;

  // ================= 环形齿轮（内齿圈，静止） =================
  // 内齿轮几何：谷底（齿根圆）在节圆外侧，齿尖（齿顶圆）在节圆内侧
  const ringOuter = (R + toothH * 1.2) * scale; // 环外缘（光滑壁）
  const ringRoot = (R + toothH * 0.3) * scale; // 齿根圆（谷底，节圆外侧）
  const ringTip = (R - toothH * 0.7) * scale; // 齿顶圆（齿尖朝内）
  const ringStep = PI2 / ringTeeth;

  // 环带淡色填充：外圆与内缘圆的同心环（nonzero 规则下反向路径构成环带，不会漫入环内）
  ctx.beginPath();
  ctx.arc(offsetX, offsetY, ringOuter, 0, PI2);
  ctx.arc(offsetX, offsetY, ringRoot, 0, PI2, true);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();

  // 逐齿梯形（平顶齿）：fill + stroke，齿形清晰可见
  for (let i = 0; i < ringTeeth; i++) {
    const a = i * ringStep;
    ctx.beginPath();
    ctx.moveTo(offsetX + ringRoot * Math.cos(a + ringStep * 0.2), offsetY + ringRoot * Math.sin(a + ringStep * 0.2));
    ctx.lineTo(offsetX + ringTip * Math.cos(a + ringStep * 0.35), offsetY + ringTip * Math.sin(a + ringStep * 0.35));
    ctx.lineTo(offsetX + ringTip * Math.cos(a + ringStep * 0.65), offsetY + ringTip * Math.sin(a + ringStep * 0.65));
    ctx.lineTo(offsetX + ringRoot * Math.cos(a + ringStep * 0.8), offsetY + ringRoot * Math.sin(a + ringStep * 0.8));
    ctx.closePath();
    ctx.fillStyle = toothFill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }

  // 外缘圆（平滑）
  ctx.beginPath();
  ctx.arc(offsetX, offsetY, ringOuter, 0, PI2);
  ctx.strokeStyle = stroke;
  ctx.stroke();
  // 内缘圆（齿根圆，弱化）
  ctx.beginPath();
  ctx.arc(offsetX, offsetY, ringRoot, 0, PI2);
  ctx.strokeStyle = strokeSoft;
  ctx.stroke();

  // ================= 滚动齿轮（外齿圆盘） =================
  const gx = centerR * Math.cos(pose.centerAngle) * scale + offsetX;
  const gy = centerR * Math.sin(pose.centerAngle) * scale + offsetY;
  const discRoot = (r - toothH * 0.7) * scale; // 齿根圆（谷底，节圆内侧）
  const discTip = (r + toothH * 0.2) * scale; // 齿顶圆（齿尖朝外，不超环谷底线）
  const rollStep = PI2 / rollingTeeth;

  ctx.save();
  ctx.translate(gx, gy);
  ctx.rotate(pose.spinAngle);

  // 盘面填充（实心圆盘）
  ctx.beginPath();
  ctx.arc(0, 0, discRoot, 0, PI2);
  ctx.fillStyle = fill;
  ctx.fill();

  // 逐齿外齿梯形：fill + stroke
  for (let i = 0; i < rollingTeeth; i++) {
    const a = i * rollStep;
    ctx.beginPath();
    ctx.moveTo(discRoot * Math.cos(a + rollStep * 0.2), discRoot * Math.sin(a + rollStep * 0.2));
    ctx.lineTo(discTip * Math.cos(a + rollStep * 0.35), discTip * Math.sin(a + rollStep * 0.35));
    ctx.lineTo(discTip * Math.cos(a + rollStep * 0.65), discTip * Math.sin(a + rollStep * 0.65));
    ctx.lineTo(discRoot * Math.cos(a + rollStep * 0.8), discRoot * Math.sin(a + rollStep * 0.8));
    ctx.closePath();
    ctx.fillStyle = toothFill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }

  // 盘缘圆
  ctx.beginPath();
  ctx.arc(0, 0, discRoot, 0, PI2);
  ctx.strokeStyle = strokeSoft;
  ctx.stroke();

  // 孔阵（含各笔参数圈 + 确定性随机补充圈）：统一空心圆样式
  // 孔半径基于节圆 r（= 笔孔真实位置 hole%·r），保证笔尖与孔同心
  ctx.strokeStyle = holeStroke;
  ctx.lineWidth = 1.2;
  const pattern = generateHolePattern(pens);
  const holeR = gearHoleRadius(transform, r);
  for (const h of pattern) {
    ctx.beginPath();
    ctx.arc(h.frac * r * scale * Math.cos(h.angle), h.frac * r * scale * Math.sin(h.angle), holeR, 0, PI2);
    ctx.stroke();
  }
  // 中心孔
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(1.5, 0.06 * discRoot), 0, PI2);
  ctx.stroke();

  // 自转标记（淡红短线，指向 0 号齿）
  ctx.strokeStyle = 'rgba(220,90,90,0.55)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(discRoot * 0.5, 0);
  ctx.stroke();
  ctx.lineWidth = 1.2;
  ctx.restore();

  ctx.restore();
}

/**
 * 绘制笔孔与笔尖（画在曲线之上，保证可见）：
 * 当前笔的孔 = 该笔孔洞参数对应的孔（位于 hole% 半径、局部角 0 处，
 * 与曲线起点严格重合：曲线即孔中心的运动轨迹，笔划从孔正中间画出）。
 */
export function drawPenHoles(
  ctx: CanvasRenderingContext2D,
  transform: Transform,
  pens: Pen[],
  activePenIndex: number,
  rollingTeeth: number,
  penPoints?: Array<[number, number]>,
): void {
  const { scale, offsetX, offsetY } = transform;
  const PI2 = Math.PI * 2;
  const holeR = gearHoleRadius(transform, rollingTeeth);
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < pens.length; i++) {
    if (!(penPoints && penPoints[i])) continue; // 调用方必须传笔孔曲线坐标
    const isActive = i === activePenIndex;
    const hx = penPoints[i][0] * scale + offsetX;
    const hy = penPoints[i][1] * scale + offsetY;
    // 孔描边：当前笔加深加粗（高亮但保持与孔阵同族样式）
    ctx.beginPath();
    ctx.arc(hx, hy, holeR, 0, PI2);
    ctx.strokeStyle = isActive ? 'rgba(58,70,90,0.9)' : 'rgba(118,132,152,0.55)';
    ctx.lineWidth = isActive ? 2 : 1.2;
    ctx.stroke();
    // 笔尖（彩色，填满孔内大部分：像笔杆插在孔里）
    ctx.beginPath();
    ctx.arc(hx, hy, isActive ? holeR * 0.72 : holeR * 0.45, 0, PI2);
    ctx.fillStyle = pens[i].color;
    ctx.fill();
  }
  ctx.restore();
}

/**
 * 分步渲染曲线（配合齿轮动画）：已完成的笔画全，当前笔按进度画，未开始的笔不画。
 * 返回当前笔索引。
 */
export function renderSteps(
  ctx: CanvasRenderingContext2D,
  items: RenderItem[],
  transform: Transform,
  totalProgress: number,
): number {
  const { penIndex, penProgress } = computeSteps(items.length, totalProgress);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 0; i < items.length; i++) {
    if (i > penIndex) break;
    const { points, count } = items[i].curve;
    const drawn = i < penIndex ? count : Math.max(1, Math.floor(penProgress * count));
    ctx.strokeStyle = items[i].pen.color;
    ctx.lineWidth = items[i].pen.width;
    ctx.beginPath();
    for (let j = 0; j < drawn; j++) {
      const [sx, sy] = applyTransform(transform, points[2 * j], points[2 * j + 1]);
      if (j === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();
  }
  ctx.restore();
  return penIndex;
}

/** 把完整图案绘制到指定尺寸的离屏画布（用于导出高清 PNG） */
export function renderToCanvasAt(
  items: RenderItem[],
  background: string,
  sizePx: number,
  paddingRatio = 0.04,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = sizePx;
  canvas.height = sizePx;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, sizePx, sizePx);
  const bounds = computeBounds(items.map((i) => i.curve));
  const padding = sizePx * paddingRatio;
  const t = computeTransform(bounds, sizePx, sizePx, padding);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const item of items) {
    const { points, count } = item.curve;
    ctx.strokeStyle = item.pen.color;
    ctx.lineWidth = item.pen.width * (sizePx / 1000); // 导出尺寸按比例放大笔宽（以 1000px 为基准）
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      const [sx, sy] = applyTransform(t, points[2 * i], points[2 * i + 1]);
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();
  }
  return canvas;
}
