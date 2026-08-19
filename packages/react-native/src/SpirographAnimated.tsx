import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { SpirographAnimatedProps, SpirographAnimationHandle } from './types.js';
import { useRenderData, computeGearDrawParams } from './useRenderData.js';
import { SvgRenderer } from './SvgRenderer.js';
import { SvgGearRenderer } from './SvgGearRenderer.js';
import { DrawAnimation } from '@spirograph/anim';

/**
 * Animated + controllable Spirograph SVG. Draws the finished pattern by default;
 * the ref handle exposes play/pause/resume/stop/setSpeed for a simulated drawing
 * animation (backed by @spirograph/anim's DrawAnimation).
 *
 * When `state` changes while the animation is running, the animation stops and the
 * static pattern is redrawn.
 */
export const SpirographAnimated = React.forwardRef<
  SpirographAnimationHandle,
  SpirographAnimatedProps
>(function SpirographAnimated(
  {
    state,
    size,
    showGears = false,
    playMode = 'sequential',
    baseDurationMs,
    segmentsPerSecond = 350,
    onDone,
    onPlayingChange,
    testID,
  },
  ref,
) {
  // Animation progress: 1 = fully drawn static render.
  const [progress, setProgress] = useState(1);
  const animRef = useRef<DrawAnimation | null>(null);

  // Keep latest props in refs so the animation callbacks see current values.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const onPlayingChangeRef = useRef(onPlayingChange);
  onPlayingChangeRef.current = onPlayingChange;

  // Current render data + item geometry for the current progress.
  const result = useRenderData(state, size.width, size.height, progress, playMode);
  const gearParams = useMemo(
    () => computeGearDrawParams(result.items, progress, playMode),
    [result.items, progress, playMode],
  );

  const computeDuration = useCallback((): number => {
    if (baseDurationMs) return baseDurationMs;
    const totalSegs = result.items.reduce((n, i) => n + (i.curve.count - 1), 0);
    return Math.max(1000, (totalSegs / segmentsPerSecond) * 1000);
  }, [baseDurationMs, segmentsPerSecond, result.items]);

  const notifyPlaying = useCallback((playing: boolean) => {
    onPlayingChangeRef.current?.(playing);
  }, []);

  const stopDraw = useCallback(() => {
    const anim = animRef.current;
    if (anim) {
      anim.stop();
      animRef.current = null;
    }
    setProgress(1);
    notifyPlaying(false);
  }, [notifyPlaying]);

  const play = useCallback(() => {
    const anim = animRef.current;
    if (anim && anim.isRunning) {
      if (anim.isPaused) {
        anim.resume();
        notifyPlaying(true);
      }
      return;
    }
    const duration = computeDuration();
    const next = new DrawAnimation(
      (p: number) => setProgress(p),
      () => {
        animRef.current = null;
        notifyPlaying(false);
        setProgress(1);
        onDoneRef.current?.();
      },
      duration,
    );
    next.setSpeed(state.speed);
    animRef.current = next;
    next.start();
    notifyPlaying(true);
  }, [computeDuration, notifyPlaying, state.speed]);

  const pause = useCallback(() => {
    const anim = animRef.current;
    if (anim && anim.isRunning && !anim.isPaused) anim.pause();
  }, []);

  const resume = useCallback(() => {
    const anim = animRef.current;
    if (anim && anim.isRunning && anim.isPaused) anim.resume();
  }, []);

  const setSpeed = useCallback((speed: number) => {
    animRef.current?.setSpeed(speed);
  }, []);

  React.useImperativeHandle(
    ref,
    () => ({ play, pause, resume, stop: stopDraw, setSpeed }),
    [play, pause, resume, stopDraw, setSpeed],
  );

  // Stop the animation + redraw static whenever the state object changes.
  useEffect(() => {
    stopDraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // Unmount cleanup.
  useEffect(() => {
    return () => {
      animRef.current?.stop();
      animRef.current = null;
    };
  }, []);

  return (
    <SvgRenderer
      renderData={result.renderData}
      width={size.width}
      height={size.height}
      background={state.background}
      testID={testID}
    >
      {showGears && result.items.length > 0 && (
        <SvgGearRenderer
          state={state}
          transform={result.transform}
          gearAngle={gearParams.gearAngle}
          activePenIndex={gearParams.activePenIndex}
        />
      )}
    </SvgRenderer>
  );
});
