import { computeSteps } from '@spirograph/core';
import type { RenderItem } from '@spirograph/core';

/** 一帧要画什么（纯数据，渲染端消费） */
export interface FramePlan {
  /** 分步模式下当前激活的笔索引（并行模式下为 -1） */
  penIndex: number;
  /** 当前笔内进度 [0,1]（并行模式下为总进度） */
  penProgress: number;
  /** 每笔应绘制的点数（前缀截断；= curve.count 表示画满） */
  perPenPoints: number[];
  /** 当前笔的曲线参数 t（齿轮位姿用），并行模式 = 0 */
  gearT: number;
}

export interface FramePlanOptions {
  /** true=多笔分步（当前笔激活，未开始的笔不画）；false=并行（所有笔同步推进） */
  step?: boolean;
}

/**
 * 计算某总进度下每笔应绘制多少点（纯函数，无定时器）。
 * - step 模式：computeSteps 决定当前笔，已完成笔画满，未开始的不画
 * - 并行模式：每笔按各自 count 比例同步推进
 */
export function createFramePlan(
  items: RenderItem[],
  progress: number,
  opts: FramePlanOptions = {},
): FramePlan {
  const counts = items.map((i) => i.curve.count);
  const totalPens = items.length;
  const p = Math.min(1, Math.max(0, progress));

  if (opts.step) {
    const { penIndex, penProgress } = computeSteps(totalPens, p);
    const perPenPoints = counts.map((c, i) => {
      if (i < penIndex) return c;
      if (i === penIndex) return Math.max(1, Math.floor(penProgress * c));
      return 0;
    });
    const curve = items[penIndex]?.curve;
    const gearT = curve ? penProgress * 2 * Math.PI * curve.periodTurns : 0;
    return { penIndex, penProgress, perPenPoints, gearT };
  }

  const perPenPoints = counts.map((c) => Math.max(1, Math.floor(p * c)));
  return { penIndex: -1, penProgress: p, perPenPoints, gearT: 0 };
}
