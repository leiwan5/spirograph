import * as React from 'react';
import type { SpirographState } from '@spirograph/core';
import { DrawAnimation } from '@spirograph/anim';
import { exportPng as downloadPng, exportSvg as downloadSvg } from '@spirograph/canvas';
import type { CanvasRenderer } from '@spirograph/canvas';
import type { SpirographCanvasProps, SpirographHandle } from './SpirographCanvas.js';
import { useRender } from './useRender.js';

export type PlayMode = 'sequential' | 'simultaneous';

/** Imperative handle of the animated component: full export + animation control. */
export interface SpirographAnimationHandle extends SpirographHandle {
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
  /** Notifies the parent whether the animation is currently playing. */
  onPlayingChange?: (playing: boolean) => void;
}

export interface SpirographAnimatedProps extends Omit<SpirographCanvasProps, 'state'> {
  /** Full spirograph drawing state. */
  state: SpirographState;
  /** One pen at a time (default) or all pens together. */
  playMode?: PlayMode;
  /** Explicit animation duration in ms. Default: derived from segment count for constant pen speed. */
  baseDurationMs?: number;
  /** Segments-per-second target used to derive duration (only when baseDurationMs is not given). */
  segmentsPerSecond?: number;
  /** Called once when the animation finishes. */
  onDone?: () => void;
  /** Called when playing state flips (start/pause/resume/stop). */
  onPlayingChange?: (playing: boolean) => void;
}

/**
 * Animated + controllable Spirograph canvas. Draws the finished pattern by default;
 * the ref handle exposes play/pause/resume/stop/setSpeed for a simulated drawing animation
 * (backed by @spirograph/anim's DrawAnimation) plus PNG/SVG export.
 *
 * When `state` changes while the animation is running, the animation stops and the
 * static pattern is redrawn (the same behavior as the vanilla demo).
 */
export const SpirographAnimated = React.forwardRef<
  SpirographAnimationHandle,
  SpirographAnimatedProps
>(function SpirographAnimated(
  {
    state,
    className,
    style,
    id,
    playMode = 'sequential',
    baseDurationMs,
    segmentsPerSecond = 350,
    onDone,
    onPlayingChange,
  },
  ref,
) {
  const stateRef = React.useRef(state);
  stateRef.current = state;
  const playModeRef = React.useRef(playMode);
  playModeRef.current = playMode;
  const segmentsPerSecondRef = React.useRef(segmentsPerSecond);
  segmentsPerSecondRef.current = segmentsPerSecond;
  const baseDurationRef = React.useRef(baseDurationMs);
  baseDurationRef.current = baseDurationMs;
  const onDoneRef = React.useRef(onDone);
  onDoneRef.current = onDone;
  const onPlayingChangeRef = React.useRef(onPlayingChange);
  onPlayingChangeRef.current = onPlayingChange;

  const animRef = React.useRef<DrawAnimation | null>(null);

  const renderStatic = React.useCallback(() => {
    rendererRef.current?.renderStatic(stateRef.current);
  }, []);
  const { canvasRef, rendererRef } = useRender(renderStatic, [state]);

  const notifyPlaying = React.useCallback((playing: boolean) => {
    onPlayingChangeRef.current?.(playing);
  }, []);

  const computeDuration = React.useCallback((): number => {
    if (baseDurationRef.current) return baseDurationRef.current;
    const renderer: CanvasRenderer | null = rendererRef.current;
    const items = renderer ? renderer.items(stateRef.current) : [];
    const totalSegs = items.reduce((n, i) => n + (i.curve.count - 1), 0);
    return Math.max(1000, (totalSegs / segmentsPerSecondRef.current) * 1000);
  }, []);

  const stopDraw = React.useCallback(() => {
    const anim = animRef.current;
    if (anim) {
      anim.stop();
      animRef.current = null;
    }
    notifyPlaying(false);
    rendererRef.current?.renderStatic(stateRef.current);
  }, [notifyPlaying]);

  const play = React.useCallback(() => {
    const renderer: CanvasRenderer | null = rendererRef.current;
    if (!renderer) return;
    const anim = animRef.current;
    if (anim && anim.isRunning) {
      if (anim.isPaused) {
        anim.resume();
        notifyPlaying(true);
      }
      return;
    }
    const next = new DrawAnimation(
      (progress: number) =>
        renderer.renderProgress(stateRef.current, playModeRef.current, progress),
      () => {
        animRef.current = null;
        notifyPlaying(false);
        onDoneRef.current?.();
        renderer.renderStatic(stateRef.current);
      },
      computeDuration(),
    );
    next.setSpeed(stateRef.current.speed);
    animRef.current = next;
    next.start();
    notifyPlaying(true);
  }, [computeDuration, notifyPlaying]);

  const pause = React.useCallback(() => {
    const anim = animRef.current;
    if (anim && anim.isRunning && !anim.isPaused) anim.pause();
  }, []);

  const resume = React.useCallback(() => {
    const anim = animRef.current;
    if (anim && anim.isRunning && anim.isPaused) anim.resume();
  }, []);

  const setSpeed = React.useCallback((speed: number) => {
    animRef.current?.setSpeed(speed);
  }, []);

  React.useImperativeHandle(
    ref,
    () => ({
      exportPng(size = 2048, filename = 'spirograph.png') {
        const renderer: CanvasRenderer | null = rendererRef.current;
        if (!renderer) return;
        const current = stateRef.current;
        downloadPng(renderer.items(current), current.background, size, filename);
      },
      exportSvg(size = 2048, filename = 'spirograph.svg') {
        const renderer: CanvasRenderer | null = rendererRef.current;
        if (!renderer) return;
        const current = stateRef.current;
        downloadSvg(renderer.items(current), current.background, size, filename);
      },
      play,
      pause,
      resume,
      stop: stopDraw,
      setSpeed,
    }),
    [play, pause, resume, stopDraw, setSpeed],
  );

  // Stop the animation + redraw static whenever the state object changes.
  React.useEffect(() => {
    stopDraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // Unmount cleanup.
  React.useEffect(() => {
    return () => {
      animRef.current?.stop();
      animRef.current = null;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      id={id}
      className={className}
      style={{ width: '100%', height: '100%', display: 'block', ...style }}
    />
  );
});
