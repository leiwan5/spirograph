/** 绘制模式：内切（hypotrochoid）/ 外切（epitrochoid） */
export type DrawingMode = 'inside' | 'outside';

/** 一支笔：孔洞位置（占滚动齿轮半径百分比）+ 一组颜色 + 粗细 */
export interface Pen {
  id: number;
  hole: number; // 0-100, 百分比（真实 Spirograph 孔洞都在齿轮盘内，d ≤ r）
  // 颜色列表：仅 1 个 = 单色笔；≥ 2 个 = 渐变笔（沿曲线按 spacing 间隔循环取色）
  colors: string[];
  spacing: number; // 渐变间隔（% 曲线长度，0-100）；单色笔时忽略
  width: number; // 屏幕像素
}

/** 应用绘制参数（不含播放状态，播放由 UI 层管理） */
export interface AppState {
  mode: DrawingMode;
  ringTeeth: number;
  rollingTeeth: number;
  pens: Pen[];
  background: string;
  speed: number; // 动画速度倍率 0.1-10
  scaleMode: 'auto' | 'fixed'; // auto=联合包围盒自适应充满；fixed=固定齿轮比例（调孔洞不影响整图缩放）
  showGears: boolean; // 动画时显示齿轮（多笔分步完成）
}

/** 化简后的齿轮信息 */
export interface GearRatio {
  p: number; // ringTeeth / gcd
  q: number; // rollingTeeth / gcd
  petals: number; // 花瓣数
}

/** 曲线采样结果：x,y 交错存储，首尾闭合（最后一点 === 第一点） */
export interface CurveData {
  points: Float64Array;
  count: number; // 点数（含闭合重复点）
  ratio: GearRatio;
  periodTurns: number; // 闭合需要滚动齿轮转 q 圈
  totalSamples: number; // 实际线段数 = count - 1
  reduced: boolean; // 是否因采样上限被降采样
}

/** 屏幕坐标变换 */
export interface Transform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** 一条待渲染的曲线及其笔配置 */
export interface RenderItem {
  curve: CurveData;
  pen: Pen;
}

/**
 * 线段级渲染契约（跨平台统一）：坐标已应用屏幕变换，颜色已解析（渐变在此收敛），
 * 浏览器 Canvas / SVG / 光栅 PNG / 未来 React Native 全部消费同一份数据 → 三端颜色决策一致。
 */
export interface RenderSegment {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  color: string; // 该段颜色（渐变笔为逐段解析色，单色笔为 pen.color）
  width: number; // 屏幕像素笔宽
}

/** 单支笔在线段数组中的区间 */
export interface PenRange {
  first: number; // 首段索引
  count: number; // 段数
  uniformColor: string | null; // 单色笔统一颜色（渐变笔为 null，供渲染器走快速单路径）
  width: number;
}

export interface RenderData {
  segments: RenderSegment[];
  pens: PenRange[];
}
