# @spirograph/canvas

Browser-only Canvas 2D glue for [Spirograph](https://github.com/your-org/spirograph-generator): a curve-caching renderer (`CanvasRenderer`) that draws static patterns and animation frames, plus PNG/SVG export download helpers. It sits on top of the pure [@spirograph/core](../core) and [@spirograph/anim](../anim) packages and is consumed by [@spirograph/react](../react) and [@spirograph/svelte](../svelte).

```ts
import { CanvasRenderer, exportPng, exportSvg } from '@spirograph/canvas';

const renderer = new CanvasRenderer(canvasEl);
renderer.renderStatic(state);          // draw the finished pattern
renderer.renderProgress(state, 'sequential', 0.5); // draw an animation frame

// Export downloads
exportPng(renderer.items(state), state.background, 2048);
exportSvg(renderer.items(state), state.background, 2048);
```

This package is **DOM-dependent** (`getBoundingClientRect`, `ResizeObserver`, `devicePixelRatio`, blob downloads). Keep it out of any SSR or non-browser context; use the pure `@spirograph/core` for server-side SVG/PNG generation.
