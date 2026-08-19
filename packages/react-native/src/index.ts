// @spirograph/react-native — React Native components for Spirograph
// SVG-based rendering on @spirograph/core + @spirograph/anim

export { SpirographSvg } from './SpirographSvg.js';
export type { SpirographSvgProps } from './types.js';

export { SpirographAnimated } from './SpirographAnimated.js';
export type { SpirographAnimatedProps, SpirographAnimationHandle } from './types.js';

// Re-export types from core for convenience
export type {
  SpirographState,
  DrawingMode,
  Pen,
  CurveData,
  GearRatio,
  Transform,
  Bounds,
  RenderItem,
  RenderSegment,
  PenRange,
  RenderData,
} from '@spirograph/core';
