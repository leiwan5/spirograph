import * as React from 'react';
import type { SpirographState } from '@spirograph/core';
import { exportPng as downloadPng, exportSvg as downloadSvg } from '@spirograph/canvas';
import type { CanvasRenderer } from '@spirograph/canvas';
import { useRender } from './useRender.js';

/** Imperative handle of the render-only canvas. Use a ref to trigger exports. */
export interface SpirographHandle {
  /** Download a high-resolution PNG of the current pattern. */
  exportPng(size?: number, filename?: string): void;
  /** Download an SVG of the current pattern. */
  exportSvg(size?: number, filename?: string): void;
}

export interface SpirographCanvasProps {
  /** Full spirograph drawing state (see @spirograph/core SpirographState). */
  state: SpirographState;
  /** Extra class for the <canvas> element. */
  className?: string;
  /** Inline style merged over the canvas' default 100% sizing. */
  style?: React.CSSProperties;
  /** Stable id to pass to the underlying <canvas>. */
  id?: string;
}

/**
 * Render-only Spirograph canvas: draws the finished pattern from `state` and exposes
 * PNG/SVG export through its ref handle. No animation or timer logic — use
 * SpirographAnimated when you need a controllable drawing animation.
 */
export const SpirographCanvas = React.forwardRef<SpirographHandle, SpirographCanvasProps>(
  function SpirographCanvas({ state, className, style, id }, ref) {
    const stateRef = React.useRef(state);
    stateRef.current = state;
    const renderStatic = React.useCallback(() => {
      rendererRef.current?.renderStatic(stateRef.current);
    }, []);
    const { canvasRef, rendererRef } = useRender(renderStatic, [state]);

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
      }),
      [],
    );

    return (
      <canvas
        ref={canvasRef}
        id={id}
        className={className}
        style={{ width: '100%', height: '100%', display: 'block', ...style }}
      />
    );
  },
);
