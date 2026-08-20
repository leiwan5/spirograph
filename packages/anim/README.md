<p align="center">
  <img alt="@spirograph/anim" src="https://img.shields.io/npm/v/@spirograph/anim?label=@spirograph/anim&color=cb3837">
  <img alt="license" src="https://img.shields.io/badge/license-MIT-blue">
  <img alt="pure" src="https://img.shields.io/badge/optional%20driver-brightgreen">
</p>

<p align="center">
  <img alt="anim preview — rolling gear tracing the pattern" src="https://raw.githubusercontent.com/leiwan5/spirograph/main/docs/images/gear-anim.gif" width="280" />
</p>

# @spirograph/anim

**Optional animation driver** for the spirograph: decides *how much to draw at a given progress* (frame plans) and *schedules the drawing rhythm*. It pairs with [`@spirograph/core`](https://www.npmjs.com/package/@spirograph/core) — add it only when you need the simulated "pen tracing the pattern" animation.

## What it adds (and what it deliberately doesn't)

- **No pollution of core** — all animation math lives in core's pure data operations (`buildRenderData`'s `perPenLimit` prefix truncation, `computeSteps`, `computeGearPose`). This library only handles **scheduling** and **frame plans**; it never stuffs timers / DOM into core.
- **Injectable scheduler** — browsers / RN use `requestAnimationFrame`, Node falls back to `setTimeout`; the `FrameScheduler` interface is plug-and-play.
- **Cross-platform consistency** — `createFramePlan` is a pure function; the browser canvas and a future react-native-svg consume the *same* frame plan.

## Install

```bash
npm install @spirograph/anim @spirograph/core
```

## Usage

```ts
import { createFramePlan, DrawAnimation, autoScheduler } from '@spirograph/anim';
import { buildItems, computeBounds, computeTransform, buildRenderData } from '@spirograph/core';

const items = buildItems(state);
const t = computeTransform(computeBounds(items.map(i => i.curve)), 800, 800, 32);

// Per frame: how much each pen draws at a given progress (pure function)
const plan = createFramePlan(items, 0.42, { step: true });
const data = buildRenderData(items, t, { perPenLimit: plan.perPenPoints.map(n => Math.max(0, n - 1)) });

// Drive the animation (scheduler injectable)
const anim = new DrawAnimation(
  (progress) => renderFrame(createFramePlan(items, progress, { step: true })),
  () => renderFinal(),
  15_000,          // base duration ms
  autoScheduler(), // browser/RN rAF; Node auto-falls back to timer
);
anim.setSpeed(2);
anim.start();
anim.pause(); anim.resume(); anim.stop();
```

## Schedulers

| Scheduler | Platform | Description |
|---|---|---|
| `rafScheduler()` | browser / RN | global `requestAnimationFrame` + `performance.now`; falls back to ~16ms timer without rAF |
| `timerScheduler()` | Node | setTimeout fallback (~16ms) |
| `autoScheduler()` | any | uses rAF when available, otherwise timer **(default)** |

## Spirograph Generator (live demo)

The **Spirograph Generator** is the browser demo UI that drives this animation driver — a vanilla `<canvas>` editor where the gear/pen model can be tweaked live and animated, with PNG / SVG export and URL-based sharing.

<p align="center">
  <a href="https://leiwan5.github.io/spirograph/">
    <img alt="Spirograph Generator live app" src="https://github.com/leiwan5/spirograph/raw/main/docs/images/live-site.png" width="720" />
  </a>
</p>

▶ Try the full app — no install needed: **[https://leiwan5.github.io/spirograph/](https://leiwan5.github.io/spirograph/)**

## Sibling packages

`@spirograph/*` is a small npm-workspaces monorepo — every package is a thin adapter or layer around the shared pure core, so colors, math, and animation frames stay pixel-consistent across renderers. The other independently publishable packages:

| Package | What it is |
|---|---|
| [`@spirograph/core`](https://www.npmjs.com/package/@spirograph/core) | Pure cross-platform math, gradients, SVG/PNG generation — zero DOM / Node deps |
| [`@spirograph/canvas`](https://www.npmjs.com/package/@spirograph/canvas) | Browser-only Canvas 2D glue: renderer + PNG/SVG export helpers |
| [`@spirograph/react`](https://www.npmjs.com/package/@spirograph/react) | React `<SpirographCanvas>` / `<SpirographAnimated>` |
| [`@spirograph/svelte`](https://www.npmjs.com/package/@spirograph/svelte) | Svelte 5 `<SpirographCanvas>` / `<SpirographAnimated>` |
| [`@spirograph/react-native`](https://www.npmjs.com/package/@spirograph/react-native) | React Native SVG components on `react-native-svg` |
| [`@spirograph/cli`](https://www.npmjs.com/package/@spirograph/cli) | CLI: URL-query / JSON → PNG / SVG files |

## Build / publish

```bash
npm run build   # tsc -b → dist/
```

↳ Part of the [spirograph-generator monorepo](../../README.md). See it animate live at **[https://leiwan5.github.io/spirograph/](https://leiwan5.github.io/spirograph/)**.
