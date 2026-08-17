/** Drawing mode: inside (hypotrochoid) / outside (epitrochoid) */
export type DrawingMode = 'inside' | 'outside';

/** A pen: hole position (as % of the rolling gear radius) + a set of colors + width */
export interface Pen {
  id: number;
  hole: number; // 0-100, percent (real Spirograph holes are inside the gear disc, d ≤ r)
  // color list: exactly 1 = solid pen; ≥ 2 = gradient pen (cycles colors along the curve at spacing intervals)
  colors: string[];
  spacing: number; // gradient spacing (% of curve length, 0-100); ignored for solid pens
  width: number; // screen pixels
}

/** App drawing params (no play state; play is managed by the UI layer) */
export interface SpirographState {
  mode: DrawingMode;
  ringTeeth: number;
  rollingTeeth: number;
  pens: Pen[];
  background: string;
  speed: number; // animation speed multiplier 0.1-10
  scaleMode: 'auto' | 'fixed'; // auto=fit the joint bounding box; fixed=fixed gear scale (hole changes don't rescale the whole image)
  showGears: boolean; // show gears during animation (pens drawn in sequence)
}

/** Reduced gear info */
export interface GearRatio {
  p: number; // ringTeeth / gcd
  q: number; // rollingTeeth / gcd
  petals: number; // petal count
}

/** Curve sampling result: x,y interleaved, closed (last point === first point) */
export interface CurveData {
  points: Float64Array;
  count: number; // point count (includes the closing duplicate point)
  ratio: GearRatio;
  periodTurns: number; // rolling gear turns q times to close
  totalSamples: number; // actual segment count = count - 1
  reduced: boolean; // whether it was downsampled due to the sampling cap
}

/** Screen coordinate transform */
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

/** A curve to render and its pen config */
export interface RenderItem {
  curve: CurveData;
  pen: Pen;
}

/**
 * Segment-level render contract (unified across platforms): coordinates already screen-transformed, colors already resolved (gradients converge here),
 * browser Canvas / SVG / raster PNG / future React Native all consume the same data → consistent color decisions across all targets.
 */
export interface RenderSegment {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  color: string; // this segment's color (gradient pen = per-segment resolved color, solid pen = pen.color)
  width: number; // screen pixel width
}

/** A single pen's range within the segment array */
export interface PenRange {
  first: number; // first segment index
  count: number; // segment count
  uniformColor: string | null; // solid pen's uniform color (null for gradient pens, letting renderers use a fast single path)
  width: number;
}

export interface RenderData {
  segments: RenderSegment[];
  pens: PenRange[];
}
