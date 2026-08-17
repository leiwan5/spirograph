import * as React from 'react';
import { CanvasRenderer } from '@spirograph/canvas';

/**
 * Owns a <canvas> element + a CanvasRenderer lifecycle:
 *  - creates the renderer on mount and observes resizes (redraw via the latest renderStatic),
 *  - re-runs `renderStatic` whenever `depends` changes (e.g. the SpirographState).
 * `renderStatic` is captured in a ref so the ResizeObserver always calls the current closure.
 */
export function useRender(
  renderStatic: () => void,
  depends: React.DependencyList,
): {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  rendererRef: React.MutableRefObject<CanvasRenderer | null>;
} {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const rendererRef = React.useRef<CanvasRenderer | null>(null);
  const renderStaticRef = React.useRef(renderStatic);
  renderStaticRef.current = renderStatic;

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new CanvasRenderer(canvas);
    rendererRef.current = renderer;
    const ro = new ResizeObserver(() => renderStaticRef.current());
    ro.observe(canvas);
    return () => {
      ro.disconnect();
      rendererRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    renderStaticRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, depends);

  return { canvasRef, rendererRef };
}
