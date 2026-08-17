/** 渐变分段数：屏幕渲染、动画、导出、图片端点统一使用，保证各处颜色一致 */
export const GRADIENT_SEGMENTS = 128;

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** RGB 线性插值 */
export function lerpColor(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return (
    'rgb(' +
    Math.round(ar + (br - ar) * t) + ',' +
    Math.round(ag + (bg - ag) * t) + ',' +
    Math.round(ab + (bb - ab) * t) + ')'
  );
}

/**
 * 间隔渐变（闭合回环）：颜色等距落在曲线上（间距 spacing%，第 1 色在 0 处），色用尽后循环。
 * 相邻两个颜色点之间的整段线段：从一端颜色渐变到另一端。
 * 例 colors=[红,蓝,绿,橙], spacing=10：
 *   位置 0/10/20/30/40/50...= 红/蓝/绿/橙/红/蓝...；[0,10)红→蓝，[10,20)蓝→绿，...
 * 曲线是闭合的：100% 处回到 0%（起点）。因此最后一格（最后一个颜色点 →100%）
 * 渐变回初始色 colors[0]，保证收笔衔接（末尾颜色变回初始颜色，无跳变）。
 * 位置 p ∈ [k·spacing, (k+1)·spacing] 取 colors[k%n] → colors[(k+1)%n] 渐变。
 */
export function gradientColorAt(colors: string[], t: number, spacing: number): string {
  const n = colors.length;
  if (n <= 0) return '#000000';
  if (n === 1) return colors[0];
  const s = Math.max(1, spacing); // 间隔至少 1%
  const p = Math.min(100, Math.max(0, t * 100));

  // 在闭合区间 [0,100] 上分布的配色点数 = ceil(100/s)；最后一个点必 < 100。
  // 第 slot 个点的位置 = slot*s，颜色 = colors[slot % n]。
  const lastIdx = Math.ceil(100 / s) - 1; // 最后一个（闭合前）颜色点的索引
  const lastPos = lastIdx * s; // 其位置，恒 < 100
  const slot = Math.min(Math.floor(p / s), lastIdx);

  if (slot === lastIdx) {
    // 闭合前最后一格：从当前位置的渐变色渐变回初始色 colors[0]，跨度 = 100 - lastPos
    const span = Math.max(1, 100 - lastPos);
    const local = Math.min(1, Math.max(0, (p - lastPos) / span));
    return lerpColor(colors[lastIdx % n], colors[0], local);
  }
  const c1 = colors[slot % n];
  const c2 = colors[(slot + 1) % n];
  const local = Math.min(1, Math.max(0, p / s - slot));
  return lerpColor(c1, c2, local);
}
