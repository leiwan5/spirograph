<p align="center">
  <img alt="Spirograph demo running in the Expo app on a phone" src="https://raw.githubusercontent.com/leiwan5/spirograph/main/docs/images/react-native-phone.png" width="280" />
</p>

# @spirograph/react-native

React Native components for Spirograph, rendered with
[`react-native-svg`](https://github.com/software-mansion/react-native-svg) on top
of the pure, cross-platform [`@spirograph/core`](../core).

It reuses the core library's segment-level render contract (`buildRenderData`
from `@spirograph/core`) — the exact same math and color decisions as the web
Canvas/SVG/PNG renderers — so React Native output is pixel-consistent with every
other platform.

## Install

```sh
npm install @spirograph/react-native react-native-svg
```

Peer dependencies: `react >= 18`, `react-native >= 0.72`, `react-native-svg >= 15`.

## Components

```tsx
import { useState } from 'react';
import { SpirographSvg, SpirographAnimated } from '@spirograph/react-native';
import type { SpirographState } from '@spirograph/react-native';
```

### `<SpirographSvg>`

Render-only static view of the finished pattern.

```tsx
const state: SpirographState = {
  mode: 'inside',
  ringTeeth: 72,
  rollingTeeth: 30,
  pens: [
    { id: 1, hole: 40, colors: ['#e63946'], spacing: 20, width: 4 },
    { id: 2, hole: 75, colors: ['#4cc9f0'], spacing: 20, width: 3.5 },
  ],
  background: '#111827',
  speed: 1,
  scaleMode: 'auto',
  showGears: false,
};

<SpirographSvg state={state} size={{ width: 320, height: 320 }} showGears />
```

### `<SpirographAnimated>`

Adds a controllable drawing animation. Drive it through the ref handle:

```tsx
import { useRef } from 'react';
import type { SpirographAnimationHandle } from '@spirograph/react-native';

const ref = useRef<SpirographAnimationHandle>(null);

<SpirographAnimated
  ref={ref}
  state={state}
  size={{ width: 320, height: 320 }}
  playMode={state.pens.length > 1 ? 'sequential' : 'simultaneous'}
  onPlayingChange={setPlaying}
/>;

ref.current?.play();
ref.current?.pause();
ref.current?.stop();
ref.current?.setSpeed(2);
```

`playMode`: `'simultaneous'` (all pens draw together) or `'sequential'` (one pen
at a time, weighted by curve length — the default, matching the web components).

## Props

| Prop                 | Type                              | Description                                              |
| -------------------- | --------------------------------- | -------------------------------------------------------- |
| `state`              | `SpirographState`                 | Full drawing state (see `@spirograph/core`).             |
| `size`               | `{ width, height }`               | SVG viewport size in dp.                                 |
| `showGears`          | `boolean`                         | Overlay the gear system beneath the curve.               |
| `playMode`           | `'sequential' \| 'simultaneous'`  | Animation mode (animated only).                          |
| `segmentsPerSecond`  | `number`                          | Duration derivation target (animated only, default 350). |
| `baseDurationMs`     | `number`                          | Explicit animation duration in ms (animated only).       |
| `onDone`             | `() => void`                      | Called when the animation finishes (animated only).      |
| `onPlayingChange`    | `(p: boolean) => void`            | Called when playing state flips (animated only).         |

## How it works

- `useRenderData(state, width, height, progress, playMode)` uses
  `@spirograph/core`'s `sampleCurve` + `computeTransform` + `buildRenderData` to
  produce already screen-transformed, color-resolved `RenderSegment`s.
- `SvgRenderer` renders solid pens as a single batched `<Path>` and gradient pens
  as per-segment `<Line>`s.
- The animation driver is [`@spirograph/anim`](../anim)'s framework-agnostic
  `DrawAnimation` (injectable rAF/timer scheduler), the same one the web
  components use.
- Gear rendering: `SvgGearRenderer` is an SVG port of the core's Canvas 2D gear
  drawing.

## Live demo

See `<SpirographSvg>` / `<SpirographAnimated>` in action on the **React Native demo
page** of the live site:

**[https://leiwan5.github.io/spirograph/react-native.html](https://leiwan5.github.io/spirograph/react-native.html)** — docs + an embedded **Expo Snack** live demo you can run right in the page (react-native-web) or open in Expo Go on your phone via QR.

For a full native app, the repo also ships the **Expo demo app** at `apps/expo-demo` — interactive pattern/pen controls and playback powered by this package.

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
| [`@spirograph/react`](https://www.npmjs.com/package/@spirograph/react) | React `<SpirographCanvas>` / `<SpirographAnimated>` |
| [`@spirograph/svelte`](https://www.npmjs.com/package/@spirograph/svelte) | Svelte 5 `<SpirographCanvas>` / `<SpirographAnimated>` |
| [`@spirograph/cli`](https://www.npmjs.com/package/@spirograph/cli) | CLI: URL-query / JSON → PNG / SVG files |

## Dev

```sh
# from the repo root
npm run build:packages          # builds core/anim/canvas/react/react-native
cd apps/expo-demo && npx expo start   # try the demo app
```

There's a docs landing page with an **embedded Expo Snack live demo** at
`/react-native.html` (dev: `npm run dev`, build: `npm run build`). It runs the
demo in the browser (react-native-web via Snack) or as an Expo Go QR. To wire up
the embed, publish `apps/expo-demo/snack` to <https://snack.expo.dev> and paste
its id into `src/demos/react-native/snackConfig.ts`.

This package is **dependency-light**: its only runtime deps are
`@spirograph/core` and `@spirograph/anim`, plus peer `react-native-svg`. It
declares a minimal structural type shim for `react-native-svg` (like
`core/browser.ts` does for Canvas 2D) so it compiles without pulling in the full
native SDK — the real `react-native-svg` is structurally compatible at runtime.
