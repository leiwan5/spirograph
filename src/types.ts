export type DrawingMode = 'inside' | 'outside';

/** 渐变中的一个颜色断点：颜色停在 position 处，末尾 transition 长度内过渡到下一个颜色 */
export interface GradientStop {
  color: string;
  pos: number; // 该颜色区间结束位置（% 曲线长度，0-100）
  trans: number; // 该区间末尾过渡长度（% 曲线长度，0-100；最后一段无过渡）
}

/** 一支笔：孔洞位置（占滚动齿轮半径百分比）+ 颜色 + 粗细 */
export interface Pen {
  id: number;
  hole: number; // 0-100, 百分比（真实 Spirograph 孔洞都在齿轮盘内，d ≤ r）
  color: string; // 起始颜色（无渐变时的单色）
  gradient: GradientStop[]; // 渐变断点（空 = 单色；≥2 个 = 分段渐变）
  gradientLoop: boolean; // 循环渐变：整轮断点周期循环
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
