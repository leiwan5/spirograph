<p align="center">
  <img alt="@spirograph/react" src="https://img.shields.io/npm/v/@spirograph/react?label=@spirograph/react&color=cb3837">
  <img alt="react" src="https://img.shields.io/badge/React-19-blue">
  <img alt="license" src="https://img.shields.io/badge/license-MIT-blue">
</p>

<p align="center">
  <img alt="react preview — rolling gear tracing the pattern" src="https://raw.githubusercontent.com/leiwan5/spirograph/main/docs/images/gear-react.gif" width="280" />
</p>

# @spirograph/react

React components for Spirograph — a render-only canvas and an animated, controllable canvas. They wrap the pure [`@spirograph/core`](../core) math + [`@spirograph/canvas`](../canvas) Canvas 2D glue, so patterns, gradients, and animation frames stay pixel-consistent with every other renderer.

## Install

```bash
npm i @spirograph/react
```

## Render-only canvas

Draws the finished pattern from a `SpirographState`; exposes PNG/SVG export through a ref handle.

```tsx
import { useRef } from 'react';
import { SpirographCanvas, type SpirographHandle } from '@spirograph/react';
import { DEFAULT_STATE } from '@spirograph/core';

export default function App() {
  const ref = useRef<SpirographHandle>(null);
  return (
    <div style={{ width: 480, height: 480 }}>
      <SpirographCanvas ref={ref} state={DEFAULT_STATE} />
      <button onClick={() => ref.current?.exportPng()}>PNG</button>
      <button onClick={() => ref.current?.exportSvg()}>SVG</button>
    </div>
  );
}
```

## Animated, controllable canvas

Adds a simulated drawing animation plus `play` / `pause` / `resume` / `stop` / `setSpeed` control through the ref.

```tsx
import { useRef } from 'react';
import { SpirographAnimated, type SpirographAnimationHandle } from '@spirograph/react';
import { DEFAULT_STATE } from '@spirograph/core';

export default function App() {
  const ref = useRef<SpirographAnimationHandle>(null);
  return (
    <>
      <div style={{ width: 480, height: 480 }}>
        <SpirographAnimated ref={ref} state={DEFAULT_STATE} />
      </div>
      <button onClick={() => ref.current?.play()}>Play</button>
      <button onClick={() => ref.current?.pause()}>Pause</button>
      <button onClick={() => ref.current?.stop()}>Stop</button>
    </>
  );
}
```

## Draw with gears

The gear mechanism (a fixed ring + a rolling gear) is rendered during the animation whenever **`state.showGears`** is `true`. It's a field of `SpirographState` (same as the vanilla demo and the CLI), so just pass it through `state`:

```tsx
<SpirographAnimated
  ref={ref}
  state={{ ...DEFAULT_STATE, showGears: true }}
/>
```

Gears roll with the active pen as the pattern is traced, and freeze into place on the finished static drawing. Works on both `<SpirographCanvas>` (static gears beneath the full pattern) and `<SpirographAnimated>` (rotating gears during playback).

## Props

| Component | Prop | Type | Default | Note |
|---|---|---|---|---|
| both | `state` | `SpirographState` | — | drawing state (see `@spirograph/core`) |
| both | `className` / `style` / `id` | — | — | passed to `<canvas>` |
| `SpirographAnimated` | `playMode` | `'sequential' \| 'simultaneous'` | `'sequential'` | one pen at a time / all together |
| `SpirographAnimated` | `baseDurationMs` | `number?` | derived | explicit animation duration |
| `SpirographAnimated` | `segmentsPerSecond` | `number?` | `350` | target speed when duration is derived |
| `SpirographAnimated` | `onDone` | `() => void?` | — | fired when the animation completes |
| `SpirographAnimated` | `onPlayingChange` | `(playing) => void?` | — | fired when play state flips |

## Ref handles

| Handle | Type | Methods |
|---|---|---|
| `SpirographHandle` | render-only | `exportPng(size?, filename?)`, `exportSvg(size?, filename?)` |
| `SpirographAnimationHandle` | animated | extends render-only + `play()`, `pause()`, `resume()`, `stop()`, `setSpeed(speed)`, `onPlayingChange?` |

> **Behavior**: when `state` changes while animating, the animation stops and the static pattern is redrawn (same as the vanilla demo).

## Live demo

See `<SpirographCanvas>` / `<SpirographAnimated>` in action on the **React demo page** of the live site:

**[https://leiwan5.github.io/spirograph/react.html](https://leiwan5.github.io/spirograph/react.html)** — docs + live render-only &amp; animated examples.

## Spirograph Generator (live demo)

The **Spirograph Generator** is the browser demo UI behind this library — a vanilla `<canvas>` editor where the same gear/pen/animation model can be tweaked live, with PNG / SVG export and URL-based sharing.

▶ Try the full app — no install needed: **[https://leiwan5.github.io/spirograph/](https://leiwan5.github.io/spirograph/)**

## Sibling packages

`@spirograph/*` is a small npm-workspaces monorepo — every package is a thin adapter or layer around the shared pure core, so colors, math, and animation frames stay pixel-consistent across renderers. The other independently publishable packages:

| Package | What it is |
|---|---|
| [`@spirograph/core`](https://www.npmjs.com/package/@spirograph/core) | Pure cross-platform math, gradients, SVG/PNG generation — zero DOM / Node deps |
| [`@spirograph/anim`](https://www.npmjs.com/package/@spirograph/anim) | Optional animation driver with an injectable frame scheduler |
| [`@spirograph/canvas`](https://www.npmjs.com/package/@spirograph/canvas) | Browser-only Canvas 2D glue: renderer + PNG/SVG export helpers |
| [`@spirograph/svelte`](https://www.npmjs.com/package/@spirograph/svelte) | Svelte 5 `<SpirographCanvas>` / `<SpirographAnimated>` |
| [`@spirograph/react-native`](https://www.npmjs.com/package/@spirograph/react-native) | React Native SVG components on `react-native-svg` |
| [`@spirograph/cli`](https://www.npmjs.com/package/@spirograph/cli) | CLI: URL-query / JSON → PNG / SVG files |

## Development / demo

```bash
npm run dev        # from the monorepo root → React demo at /react.html
npm run build      # tsc -b → dist/
```

↳ Part of the [spirograph-generator monorepo](../../README.md). See also the [Svelte sibling](../svelte).
