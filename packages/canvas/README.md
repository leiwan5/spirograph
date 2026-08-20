<p align="center">
  <img alt="@spirograph/canvas" src="https://img.shields.io/npm/v/@spirograph/canvas?label=@spirograph/canvas&color=cb3837">
  <img alt="license" src="https://img.shields.io/badge/license-MIT-blue">
  <img alt="browser-only" src="https://img.shields.io/badge/browser%20only-DOM-orange">
</p>

<p align="center">
  <img alt="canvas preview" src="https://raw.githubusercontent.com/leiwan5/spirograph/main/docs/images/preview-canvas.png" width="280" />
</p>

# @spirograph/canvas

Browser-only **Canvas 2D glue** for Spirograph: a curve-caching renderer (`CanvasRenderer`) that draws static patterns and animation frames, plus **PNG/SVG export download helpers**. It sits on top of the pure [`@spirograph/core`](../core) and [`@spirograph/anim`](../anim) packages, and is the shared rendering layer consumed by both [`@spirograph/react`](../react) and [`@spirograph/svelte`](../svelte).

> ⚠️ This package is **DOM-dependent** (`getBoundingClientRect`, `ResizeObserver`, `devicePixelRatio`, blob downloads). Keep it out of SSR / non-browser contexts — use the pure `@spirograph/core` for server-side SVG/PNG generation.

## Install

```bash
npm install @spirograph/canvas @spirograph/core @spirograph/anim
```

## Renderer

```ts
import { CanvasRenderer } from '@spirograph/canvas';

const renderer = new CanvasRenderer(canvasEl);
renderer.renderStatic(state);            // draw the finished pattern
renderer.renderProgress(state, 'sequential', 0.5); // draw an animation frame
```

- **Curve caching** — sampling is cached keyed by `(mode/ring/rolling/hole list)`, so parameter drags don't resample unnecessarily (identical strategy to the vanilla demo).
- **DPR-aware** — scales for `devicePixelRatio` and observes resize; never renders below 80×80 CSS px.

### Animation frames

`makeAnimationFrame(renderer, getState, playMode)` returns a `(progress) => boolean` callback for the animation driver. It draws each frame and returns whether more frames should continue, and tracks mount state to avoid drawing to a detached canvas.

```ts
import { CanvasRenderer, makeAnimationFrame } from '@spirograph/canvas';
import { DrawAnimation, autoScheduler } from '@spirograph/anim';

const renderer = new CanvasRenderer(canvasEl);
const frame = makeAnimationFrame(renderer, () => state, 'sequential');
new DrawAnimation(frame, () => renderer.renderStatic(state), 15_000, autoScheduler()).start();
```

## Export helpers

```ts
import { exportPng, exportSvg, exportState, downloadBlob } from '@spirograph/canvas';
import { renderer } from './setup'; // a CanvasRenderer instance

exportPng(renderer.items(state), state.background, 2048);   // download high-res PNG
exportSvg(renderer.items(state), state.background, 2048);   // download SVG
exportState(renderer.items(state), state, 'png', 2048);     // format: 'png' | 'svg'
downloadBlob(blob, 'pattern.png');                          // low-level Blob download
```

## API reference

### `CanvasRenderer`

| Method | Signature | Description |
|---|---|---|
| `items` | `(state: SpirographState) => RenderItem[]` | build render items (cached by curve geometry), merging latest pen props |
| `canvasSize` | `() => { width, height }` | current content-box size in CSS px (never < 80×80) |
| `renderStatic` | `(state) => void` | draw the finished full pattern (optionally with gears beneath) |
| `renderProgress` | `(state, playMode, progress) => void` | draw an animation frame; `sequential`/`simultaneous`; gears rotate with the active pen |

### Export + frame helpers

| Export | Signature | Description |
|---|---|---|
| `makeAnimationFrame` | `(renderer, getState, playMode) => (progress) => boolean` | async frame callback for the animation driver |
| `exportPng` | `(items, background, sizePx?, filename?) => void` | download a high-res PNG |
| `exportSvg` | `(items, background, sizePx?, filename?) => void` | download an SVG |
| `exportState` | `(items, state, format, sizePx?) => void` | download keyed by rendering state (`'png' \| 'svg'`) |
| `downloadBlob` | `(blob, filename) => void` | trigger a browser Blob download |

## Used by

- [`@spirograph/react`](../react) — `<SpirographCanvas>` / `<SpirographAnimated>`
- [`@spirograph/svelte`](../svelte) — `<SpirographCanvas>` / `<SpirographAnimated>`

## Spirograph Generator (live demo)

The **Spirograph Generator** is the browser demo UI that uses this renderer — a vanilla `<canvas>` editor where the gear/pen model can be tweaked live, with PNG / SVG export and URL-based sharing.

▶ Try the full app — no install needed: **[https://leiwan5.github.io/spirograph/](https://leiwan5.github.io/spirograph/)**

## Sibling packages

`@spirograph/*` is a small npm-workspaces monorepo — every package is a thin adapter or layer around the shared pure core, so colors, math, and animation frames stay pixel-consistent across renderers. The other independently publishable packages:

| Package | What it is |
|---|---|
| [`@spirograph/core`](https://www.npmjs.com/package/@spirograph/core) | Pure cross-platform math, gradients, SVG/PNG generation — zero DOM / Node deps |
| [`@spirograph/anim`](https://www.npmjs.com/package/@spirograph/anim) | Optional animation driver with an injectable frame scheduler |
| [`@spirograph/react`](https://www.npmjs.com/package/@spirograph/react) | React `<SpirographCanvas>` / `<SpirographAnimated>` |
| [`@spirograph/svelte`](https://www.npmjs.com/package/@spirograph/svelte) | Svelte 5 `<SpirographCanvas>` / `<SpirographAnimated>` |
| [`@spirograph/react-native`](https://www.npmjs.com/package/@spirograph/react-native) | React Native SVG components on `react-native-svg` |
| [`@spirograph/cli`](https://www.npmjs.com/package/@spirograph/cli) | CLI: URL-query / JSON → PNG / SVG files |

## Build / publish

```bash
npm run build   # tsc -b → dist/
```

↳ Part of the [spirograph-generator monorepo](../../README.md). See the reviewed pattern live at **[https://leiwan5.github.io/spirograph/](https://leiwan5.github.io/spirograph/)**.
