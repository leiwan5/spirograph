import type { Bounds, CurveData, DrawingMode, Pen, Transform } from '../types';

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
