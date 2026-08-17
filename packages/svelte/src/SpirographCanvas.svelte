<script lang="ts">
  // Render-only Spirograph canvas, written with Svelte 5 runes.
  // The public prop is named `state`; we alias it to a local `pattern` so that the
  // `$state` rune is not ambiguous with a `state` binding (Svelte 5 would otherwise
  // treat `$state` as a store subscription of a variable named `state`).
  import { onDestroy } from 'svelte';
  import type { AppState } from '@spirograph/core';
  import { CanvasRenderer, exportPng, exportSvg } from '@spirograph/canvas';
  import type { CanvasRenderer as CanvasRendererType } from '@spirograph/canvas';
  import type { SpirographControl } from './types.js';

  interface Props {
    /** Full spirograph drawing state (see @spirograph/core AppState). */
    state: AppState;
    className?: string;
    style?: string;
    id?: string;
    control?: SpirographControl | undefined;
  }

  let { state: pattern, className = '', style = '', id = undefined, control = undefined }: Props = $props();

  let canvas = $state<HTMLCanvasElement>();
  let renderer: CanvasRendererType | null = null;
  let ro: ResizeObserver | null = null;
  let wired = false;

  function renderStatic(): void {
    renderer?.renderStatic(pattern);
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
  }

  // After the canvas binds and whenever the pattern changes: (re)create the renderer and redraw.
  $effect(() => {
    if (!canvas) return;
    if (!renderer) {
      renderer = new CanvasRenderer(canvas);
      ro = new ResizeObserver(() => renderStatic());
      ro.observe(canvas);
      wireControl();
    }
    renderStatic();
  });

  onDestroy(() => {
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
