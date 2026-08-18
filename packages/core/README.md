<p align="center">
  <img alt="@spirograph/core" src="https://img.shields.io/npm/v/@spirograph/core?label=@spirograph/core&color=cb3837">
  <img alt="license" src="https://img.shields.io/badge/license-MIT-blue">
  <img alt="pure" src="https://img.shields.io/badge/zero%20platform%20deps-%E2%9C%93-success">
</p>

<p align="center">
  <img alt="core preview" src="../../docs/images/preview-core.png" width="280" />
</p>

# @spirograph/core

**Cross-platform spirograph pattern generation core.** Pure math that turns gear specs into exact hypotrochoid / epitrochoid curves, gradients, and frame-ready render data — with **zero DOM / zero Node dependencies**. The same code runs in browsers, Node.js, React Native (Hermes), and Vercel / Cloudflare Workers.

Every other package in this monorepo — `@spirograph/canvas`, `@spirograph/react`, `@spirograph/svelte`, and the CLI — is a thin adapter on top of this core, so any fix or feature here propagates everywhere.

## Why a framework-agnostic core

- **Pure math** — gear reduction, curve sampling (hypotrochoid / epitrochoid), bounding boxes, centering transforms.
- **Unified gradient sampling** — colors resolved once, so Canvas, SVG, PNG, React, and Svelte all make *identical* color decisions.
- **Segment-level render contract** `buildRenderData` — coordinates already transformed, colors already resolved, ready for any renderer on any platform.
- **Built-in serialization** — SVG string / PNG bytes (pure-JS pako encoding; no `TextEncoder` / `URLSearchParams` dependency).
- **Tree-shakeable** — `sideEffects: false`; two entry points (`.`, `./browser`).

## Install

```bash
npm install @spirograph/core
```

## Usage

```ts
import { DEFAULT_STATE, parseState, buildItems, buildSvg, generatePng } from '@spirograph/core';

// Parse from a URL query (same format as web share links / image endpoints)
const patch = parseState('?ring=72&rolling=30&pen=40,2.5,e63946&pen=75,2,1d6fa5');
const items = buildItems({ ...DEFAULT_STATE, ...patch, pens: patch.pens ?? DEFAULT_STATE.pens });

// SVG string
const svg = buildSvg(items, '#ffffff', 2048);

// PNG bytes (Node / Serverless / browser, pure JS)
const png = generatePng('?ring=72&rolling=30&pen=40,2.5,e63946'); // Uint8Array

// Segment-level render data (consumed by RN / React / Svelte renderers)
import { computeBounds, computeTransform, buildRenderData } from '@spirograph/core';
const t = computeTransform(computeBounds(items.map(i => i.curve)), 800, 800, 32);
const data = buildRenderData(items, t); // { segments, pens }
```

### Browser Canvas rendering (`@spirograph/core/browser`)

```ts
import { clearCanvas, renderFull } from '@spirograph/core/browser';
import { computeBounds, computeTransform } from '@spirograph/core';

const ctx = clearCanvas(canvas, 800, 800, '#ffffff', window.devicePixelRatio || 1);
const t = computeTransform(computeBounds(items.map(i => i.curve)), 800, 800, 32);
renderFull(ctx, items, t);
```

## Entry points & publish surface

| Subpath | Content | Platform |
|---|---|---|
| `.` (default) | pure logic: math, geometry, gradients, render contract, SVG / PNG | everywhere |
| `./browser` | Canvas 2D rendering (minimal structural interface) | browser |

- `.` = pure logic, publishable as an npm package (browser / Node / RN-Hermes / serverless).
- `./browser` = Canvas 2D rendering with no DOM-lib dependency.

## Pen semantics

`Pen.colors: string[]` — the pen's list of colors:

- **Exactly 1 color = solid pen** (`colors: ['#e63946']`).
- **≥ 2 colors = gradient pen** — cycles through colors along the curve at `spacing` (% of curve length) intervals.
- `spacing` is ignored for solid pens; `segmentColor` / `buildRenderData` handle both semantics uniformly.

↳ See the full URL/params and math docs in the [monorepo README](../../README.md). Or try the rendered output of this library live at **[https://leiwan5.github.io/spirograph/](https://leiwan5.github.io/spirograph/)**.

## Curve sampling

- Inside (hypotrochoid): `x=(R−r)cos t + d·cos((R−r)/r·t)`, `y=(R−r)sin t − d·sin((R−r)/r·t)`
- Outside (epitrochoid): `x=(R+r)cos t − d·cos((R+r)/r·t)`, `y=(R+r)sin t − d·sin((R+r)/r·t)`
- Teeth share the same module, so radii are proportional to tooth counts; the closing period is `T=2π·q` (q = rolling teeth/gcd).
- Sampling cap `MAX_SAMPLES = 150_000`; beyond that, auto-downsampling keeps the curve closed.

## Build / publish

```bash
npm run build   # tsc -b → dist/ (ESM + .d.ts)
npm pack        # verify the tarball locally
```
