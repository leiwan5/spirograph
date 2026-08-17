// @spirograph/core/browser — 浏览器 Canvas 2D 渲染入口
// 不依赖 DOM lib：使用最小结构化 Canvas2D/CanvasElementLike 接口，
// 由调用方（web 应用）把真实 canvas / ctx 传入（结构兼容，仅需一次类型断言）。
import type { Bounds, Pen, RenderItem, Transform, DrawingMode } from './types.js';
import { computeBounds, computeTransform, applyTransform, gearHoleRadius } from './geometry.js';
import { segmentColor, closureColor } from './segments.js';
import { generateHolePattern } from './pattern.js';
import { computeGearPose, computeSteps } from './pose.js';

/** 最小 Canvas 2D 上下文接口（仅本包用到的成员，编译无需 DOM lib） */
export interface Canvas2D {
  save(): void;
  restore(): void;
  beginPath(): void;
  closePath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise?: boolean): void;
  fill(): void;
  stroke(): void;
  translate(x: number, y: number): void;
  rotate(angle: number): void;
  scale(x: number, y: number): void;
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void;
  clearRect(x: number, y: number, w: number, h: number): void;
  fillRect(x: number, y: number, w: number, h: number): void;
  lineCap: string;
  lineJoin: string;
  lineWidth: number;
  /** string | object：真实 ctx 的 strokeStyle 是 string | CanvasGradient | CanvasPattern，放宽以保证结构兼容 */
  strokeStyle: string | object;
  fillStyle: string | object;
}

/** 最小 canvas 元素接口（尺寸 + getContext） */
export interface CanvasElementLike {
  width: number;
  height: number;
  getContext(type: '2d'): Canvas2D | null;
}

/** 清空画布并绘制背景（dpr 由调用方注入，避免依赖 window） */
export function clearCanvas(
  canvas: CanvasElementLike,
  width: number,
  height: number,
  background: string,
  dpr = 1,
): Canvas2D {
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

/**
 * 渲染完整图案。所有曲线按笔顺序叠加。
 * 单色笔：一条 path（快速）；渐变笔：逐段绘制 + 收笔线（颜色同源 segmentColor）。
 * lineCap/lineJoin 用 round 保证平滑衔接。
 */
export function renderFull(ctx: Canvas2D, items: RenderItem[], transform: Transform): void {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const item of items) {
    const { points, count } = item.curve;
    if (item.pen.colors.length > 1) {
      strokeGradientCurve(ctx, points, count, item.pen, item.pen.width, transform);
      continue;
    }
    ctx.strokeStyle = item.pen.colors[0];
    ctx.lineWidth = item.pen.width;
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
  ctx: Canvas2D,
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
    if (item.pen.colors.length > 1) {
      strokeGradientCurve(ctx, points, drawn, item.pen, item.pen.width, transform, false);
      continue;
    }
    ctx.strokeStyle = item.pen.colors[0];
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

/**
 * 渐变曲线绘制（绝对无断裂）：逐点分段绘制，相邻两点的圆角 cap 在共享顶点
 * 完全重叠（等效连续 single-path 的 round join），无论转角多尖、点距多大，
 * 整条线都连续无缝。每段颜色同源 segmentColor。
 * closed=true 时补一条收笔连线（最后点→起点）闭合曲线；
 * 动画部分绘制（closed=false）不画收笔线，避免笔尖到起点出现多余连线。
 */
export function strokeGradientCurve(
  ctx: Canvas2D,
  points: Float64Array,
  count: number,
  pen: Pen,
  lineWidth: number,
  transform: Transform,
  closed = true,
): void {
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const totalSegs = Math.max(1, count - 1);

  if (count > 1) {
    for (let i = 0; i + 1 < count; i++) {
      ctx.strokeStyle = segmentColor(pen, i, totalSegs);
      const [x0, y0] = applyTransform(transform, points[2 * i], points[2 * i + 1]);
      const [x1, y1] = applyTransform(transform, points[2 * i + 2], points[2 * i + 3]);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
    // 收笔：最后一点 → 起点，闭合曲线，收笔色渐变回初始色（仅完整绘制时）
    if (closed) {
      ctx.strokeStyle = closureColor(pen);
      const [xn, yn] = applyTransform(transform, points[2 * (count - 1)], points[2 * (count - 1) + 1]);
      const [x0, y0] = applyTransform(transform, points[0], points[1]);
      ctx.beginPath();
      ctx.moveTo(xn, yn);
      ctx.lineTo(x0, y0);
      ctx.stroke();
    }
  } else if (count === 1) {
    // 单点：画一个小圆点
    ctx.fillStyle = closureColor(pen);
    ctx.beginPath();
    ctx.arc(points[0] * transform.scale + transform.offsetX, points[1] * transform.scale + transform.offsetY, lineWidth / 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** 绘制齿轮系统（画在曲线之下），真实万花尺外观 + 淡色半透明（同旧 renderer.drawGears） */
export function drawGears(
  ctx: Canvas2D,
  transform: Transform,
  ringTeeth: number,
  rollingTeeth: number,
  mode: DrawingMode,
  t: number,
  pens: Pen[],
  activePenIndex: number,
): void {
  const { scale, offsetX, offsetY } = transform;
  const R = ringTeeth;
  const r = rollingTeeth;
  const centerR = mode === 'inside' ? R - r : R + r;
  const pose = computeGearPose(R, r, mode, t);
  const toothH = 7 / scale;
  const PI2 = Math.PI * 2;
  const fill = 'rgba(150,162,182,0.14)';
  const toothFill = 'rgba(118,132,152,0.42)';
  const stroke = 'rgba(104,119,140,0.7)';
  const strokeSoft = 'rgba(130,144,164,0.35)';
  const holeStroke = 'rgba(118,132,152,0.55)';

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 1.4;

  // ================= 环形齿轮（内齿圈，静止） =================
  const ringOuter = (R + toothH * 1.2) * scale;
  const ringRoot = (R + toothH * 0.3) * scale;
  const ringTip = (R - toothH * 0.7) * scale;
  const ringStep = PI2 / ringTeeth;

  ctx.beginPath();
  ctx.arc(offsetX, offsetY, ringOuter, 0, PI2);
  ctx.arc(offsetX, offsetY, ringRoot, 0, PI2, true);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();

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

  ctx.beginPath();
  ctx.arc(offsetX, offsetY, ringOuter, 0, PI2);
  ctx.strokeStyle = stroke;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(offsetX, offsetY, ringRoot, 0, PI2);
  ctx.strokeStyle = strokeSoft;
  ctx.stroke();

  // ================= 滚动齿轮（外齿圆盘） =================
  const gx = centerR * Math.cos(pose.centerAngle) * scale + offsetX;
  const gy = centerR * Math.sin(pose.centerAngle) * scale + offsetY;
  const discRoot = (r - toothH * 0.7) * scale;
  const discTip = (r + toothH * 0.2) * scale;
  const rollStep = PI2 / rollingTeeth;

  ctx.save();
  ctx.translate(gx, gy);
  ctx.rotate(pose.spinAngle);

  ctx.beginPath();
  ctx.arc(0, 0, discRoot, 0, PI2);
  ctx.fillStyle = fill;
  ctx.fill();

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

  ctx.beginPath();
  ctx.arc(0, 0, discRoot, 0, PI2);
  ctx.strokeStyle = strokeSoft;
  ctx.stroke();

  ctx.strokeStyle = holeStroke;
  ctx.lineWidth = 1.2;
  const pattern = generateHolePattern(pens);
  const holeR = gearHoleRadius(transform, r);
  for (const h of pattern) {
    ctx.beginPath();
    ctx.arc(h.frac * r * scale * Math.cos(h.angle), h.frac * r * scale * Math.sin(h.angle), holeR, 0, PI2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(1.5, 0.06 * discRoot), 0, PI2);
  ctx.stroke();

  const markLen = pens[activePenIndex] ? Math.max(2, (pens[activePenIndex].hole / 100) * r * scale) : discRoot * 0.5;
  ctx.strokeStyle = 'rgba(220,90,90,0.6)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(markLen, 0);
  ctx.stroke();
  ctx.lineWidth = 1.2;
  ctx.restore();

  ctx.restore();
}

/** 绘制笔孔与笔尖（画在曲线之上，保证可见）（同旧 renderer.drawPenHoles） */
export function drawPenHoles(
  ctx: Canvas2D,
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
    if (!(penPoints && penPoints[i])) continue;
    const isActive = i === activePenIndex;
    const hx = penPoints[i][0] * scale + offsetX;
    const hy = penPoints[i][1] * scale + offsetY;
    ctx.beginPath();
    ctx.arc(hx, hy, isActive ? holeR * 0.72 : holeR * 0.45, 0, PI2);
    ctx.fillStyle = pens[i].colors[0];
    ctx.fill();
  }
  ctx.restore();
}

/**
 * 分步渲染曲线（配合齿轮动画）：已完成的笔画全，当前笔按进度画，未开始的笔不画。
 * 返回当前笔索引。
 */
export function renderSteps(
  ctx: Canvas2D,
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
    if (items[i].pen.colors.length > 1) {
      strokeGradientCurve(ctx, points, drawn, items[i].pen, items[i].pen.width, transform, drawn >= count);
      continue;
    }
    ctx.strokeStyle = items[i].pen.colors[0];
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

/** 把完整图案绘制到指定尺寸的离屏画布（导出高清 PNG 用；canvas 由调用方创建） */
export function renderToCanvasAt(
  items: RenderItem[],
  background: string,
  sizePx: number,
  createCanvas: (w: number, h: number) => CanvasElementLike,
  paddingRatio = 0.04,
): CanvasElementLike {
  const canvas = createCanvas(sizePx, sizePx);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, sizePx, sizePx);
  const bounds: Bounds = computeBounds(items.map((i) => i.curve));
  const padding = sizePx * paddingRatio;
  const t = computeTransform(bounds, sizePx, sizePx, padding);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const item of items) {
    const { points, count } = item.curve;
    const w = item.pen.width * (sizePx / 1000);
    if (item.pen.colors.length > 1) {
      strokeGradientCurve(ctx, points, count, item.pen, w, t);
      continue;
    }
    ctx.strokeStyle = item.pen.colors[0];
    ctx.lineWidth = w;
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
