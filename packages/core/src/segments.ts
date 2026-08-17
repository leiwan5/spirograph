import type { Pen, RenderData, RenderItem, RenderSegment, Transform } from './types.js';
import { gradientColorAt } from './gradient.js';

/**
 * 某支笔第 i 条线段（共 totalSegments 条）的颜色。
 * 多色笔（colors.length ≥ 2）：取该线段中点进度 (i+0.5)/N 处的渐变插值色；
 * 单色笔：colors[0]。全平台唯一颜色决策点，SVG/PNG/Canvas/RN 颜色从此函数收敛。
 */
export function segmentColor(pen: Pen, segmentIndex: number, totalSegments: number): string {
  if (pen.colors.length > 1) {
    const t = (segmentIndex + 0.5) / Math.max(1, totalSegments);
    return gradientColorAt(pen.colors, t, pen.spacing);
  }
  return pen.colors[0];
}

/** 渐变收笔线颜色：曲线闭合处 t=1 渐变回初始色（单色笔 = colors[0]） */
export function closureColor(pen: Pen): string {
  return pen.colors.length > 1 ? gradientColorAt(pen.colors, 1, pen.spacing) : pen.colors[0];
}

export interface BuildRenderDataOptions {
  /** 每笔最多输出的线段数（不含渐变收笔线；动画前缀截断用），默认全部 */
  perPenLimit?: number[];
  /** 渐变笔是否补收笔线（最后一点 → 起点，闭合曲线），默认 true；动画未画完时为 false */
  closed?: boolean | boolean[];
  /** 合并步长：每 d 个原始段合并为 1 段（SVG 大图抽样/提速），可全局或按笔，默认 1 */
  decimate?: number | number[];
}

/**
 * 构建线段级渲染数据（统一渲染契约）：
 * - 坐标已应用屏幕变换（transform 缩放 + 平移）
 * - 颜色已解析：渐变逐段取色 + 收笔线；单色笔统一 pen.color
 * - 宽度 = pen.width（屏幕像素），导出端按需再乘尺寸倍率
 */
export function buildRenderData(items: RenderItem[], transform: Transform, opts: BuildRenderDataOptions = {}): RenderData {
  const segments: RenderSegment[] = [];
  const pens: RenderData['pens'] = [];
  const { scale, offsetX, offsetY } = transform;
  const closedDefault = opts.closed === undefined ? true : opts.closed;

  for (let pi = 0; pi < items.length; pi++) {
    const item = items[pi];
    const { points, count } = item.curve;
    const totalSegs = Math.max(0, count - 1);
    const dec = Math.max(1, Math.floor(Array.isArray(opts.decimate) ? opts.decimate[pi] ?? 1 : opts.decimate ?? 1));
    const merged = Math.ceil(totalSegs / dec);
    const limit = Math.min(merged, opts.perPenLimit?.[pi] ?? merged);
    const isGradient = item.pen.colors.length > 1;
    const first = segments.length;

    for (let s = 0; s < limit; s++) {
      const i0 = s * dec;
      const i1 = Math.min(count - 1, i0 + dec);
      segments.push({
        x0: points[2 * i0] * scale + offsetX,
        y0: points[2 * i0 + 1] * scale + offsetY,
        x1: points[2 * i1] * scale + offsetX,
        y1: points[2 * i1 + 1] * scale + offsetY,
        color: segmentColor(item.pen, i0, totalSegs),
        width: item.pen.width,
      });
    }

    // 渐变收笔线：仅当整支笔画完（limit 达上限）且 closed 时追加
    const penClosed = Array.isArray(closedDefault) ? closedDefault[pi] ?? true : closedDefault;
    if (isGradient && penClosed && limit >= merged && count > 1) {
      const n = count - 1;
      segments.push({
        x0: points[2 * n] * scale + offsetX,
        y0: points[2 * n + 1] * scale + offsetY,
        x1: points[0] * scale + offsetX,
        y1: points[1] * scale + offsetY,
        color: closureColor(item.pen),
        width: item.pen.width,
      });
    }

    pens.push({
      first,
      count: segments.length - first,
      uniformColor: isGradient ? null : item.pen.colors[0],
      width: item.pen.width,
    });
  }
  return { segments, pens };
}
