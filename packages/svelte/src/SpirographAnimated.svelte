<script lang="ts">
  // Animated + controllable Spirograph canvas, written with Svelte 5 runes.
  // The public prop is named `state`; it is aliased to `pattern` so the `$state` rune is not
  // ambiguous with a `state` binding (see SpirographCanvas.svelte).
  import { onDestroy } from 'svelte';
  import type { SpirographState } from '@spirograph/core';
  import { DrawAnimation } from '@spirograph/anim';
  import { CanvasRenderer, exportPng, exportSvg } from '@spirograph/canvas';
  import type { CanvasRenderer as CanvasRendererType } from '@spirograph/canvas';
  import type { SpirographAnimationControl, PlayMode } from './types.js';

  interface Props {
    state: SpirographState;
    playMode?: PlayMode;
    baseDurationMs?: number;
    segmentsPerSecond?: number;
    onDone?: () => void;
    control?: SpirographAnimationControl | undefined;
    className?: string;
    style?: string;
    id?: string;
  }

  let {
    state: pattern,
    playMode = 'sequential',
    baseDurationMs,
    segmentsPerSecond = 350,
    onDone,
    control = undefined,
    className = '',
    style = '',
    id = undefined,
  }: Props = $props();

  let canvas = $state<HTMLCanvasElement>();
  let renderer: CanvasRendererType | null = null;
  let ro: ResizeObserver | null = null;
  let anim: DrawAnimation | null = null;
  let wired = false;

  function renderStatic(): void {
    renderer?.renderStatic(pattern);
  }

  function computeDuration(): number {
    if (baseDurationMs) return baseDurationMs;
    const items = renderer ? renderer.items(pattern) : [];
    const totalSegs = items.reduce((n: number, i) => n + (i.curve.count - 1), 0);
    return Math.max(1000, (totalSegs / segmentsPerSecond) * 1000);
  }

  function stopAnimation(): void {
    if (anim) {
      anim.stop();
      anim = null;
    }
  }

  function play(): void {
    if (!renderer) return;
    if (anim && anim.isRunning) {
      if (anim.isPaused) anim.resume();
      return;
    }
    const next = new DrawAnimation(
      (progress: number) => renderer!.renderProgress(pattern, playMode, progress),
      () => {
        anim = null;
        onDone?.();
        renderer?.renderStatic(pattern);
      },
      computeDuration(),
    );
    next.setSpeed(pattern.speed);
    anim = next;
    next.start();
  }

  function pause(): void {
    if (anim && anim.isRunning && !anim.isPaused) anim.pause();
  }

  function resume(): void {
    if (anim && anim.isRunning && anim.isPaused) anim.resume();
  }

  function setSpeed(speed: number): void {
    anim?.setSpeed(speed);
  }

  function wireControl(): void {
    if (wired || !control) return;
    wired = true;
    control.exportPng = (size = 2048, filename = 'spirograph.png') => {
      if (renderer) exportPng(renderer.items(pattern), pattern.background, size, filename);
    };
    control.exportSvg = (size = 2048, filename = 'spirograph.svg') => {
      if (renderer) exportSvg(renderer.items(pattern), pattern.background, size, filename);
    };
    control.play = play;
    control.pause = pause;
    control.resume = resume;
    control.stop = stopAnimation;
    control.setSpeed = setSpeed;
  }

  // After the canvas binds, and whenever the pattern changes: (re)create the renderer,
  // stop any running animation, and redraw the static pattern.
  $effect(() => {
    if (!canvas) return;
    if (!renderer) {
      renderer = new CanvasRenderer(canvas);
      ro = new ResizeObserver(() => renderStatic());
      ro.observe(canvas);
      wireControl();
    }
    stopAnimation();
    renderStatic();
  });

  onDestroy(() => {
    stopAnimation();
    ro?.disconnect();
    ro = null;
    renderer = null;
  });
</script>

<canvas
  bind:this={canvas}
  {id}
  class={className}
  style={"width:100%;height:100%;display:block;" + style}
></canvas>
