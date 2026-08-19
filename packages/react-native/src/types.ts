// @spirograph/react-native types — re-exports from core + RN-specific component props
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

import type { SpirographState } from '@spirograph/core';

/** Size of the SVG viewport */
export interface SpirographSize {
  width: number;
  height: number;
}

/** Props for the static SpirographSvg component */
export interface SpirographSvgProps {
  /** Full spirograph drawing state (see @spirograph/core SpirographState). */
  state: SpirographState;
  /** Size of the SVG viewport in dp. */
  size: SpirographSize;
  /** Show gears during static render (stationary gears beneath the curve). */
  showGears?: boolean;
  /** Optional test ID for testing. */
  testID?: string;
}

/** Props for the animated SpirographAnimated component */
export interface SpirographAnimatedProps extends Omit<SpirographSvgProps, 'showGears'> {
  /** Show gears during animation (rotating with the active pen). */
  showGears?: boolean;
  /** One pen at a time (default) or all pens together. */
  playMode?: 'sequential' | 'simultaneous';
  /** Explicit animation duration in ms. Default: derived from segment count for constant pen speed. */
  baseDurationMs?: number;
  /** Segments-per-second target used to derive duration (only when baseDurationMs is not given). */
  segmentsPerSecond?: number;
  /** Called once when the animation finishes. */
  onDone?: () => void;
  /** Called when playing state flips (start/pause/resume/stop). */
  onPlayingChange?: (playing: boolean) => void;
}

/** Imperative handle for animation control */
export interface SpirographAnimationHandle {
  /** Start (or resume) the drawing animation. */
  play(): void;
  /** Pause a running animation. */
  pause(): void;
  /** Resume a paused animation. */
  resume(): void;
  /** Stop the animation and redraw the static finished pattern. */
  stop(): void;
  /** Set the animation speed multiplier (0.1–10). */
  setSpeed(speed: number): void;
}
