# @spirograph/core

Cross-platform spirograph pattern generation core library. **Zero DOM / zero Node dependencies** — the same code runs in browsers, Node.js, React Native (Hermes), and Vercel / Cloudflare Workers.

- Pure math: gear reduction, curve sampling (hypotrochoid / epitrochoid)
- Geometry: bounding boxes, centering transforms
- Gradient color sampling: unified across targets (consistent color decisions for Canvas / SVG / PNG)
- **Segment-level render contract** `buildRenderData`: coordinates already transformed, colors already resolved, ready for renderers on every platform
- SVG string / PNG bytes (pako pure-JS encoding, no TextEncoder / URLSearchParams dependency)

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

// PNG bytes (works in Node / Serverless / browser, pure JS)
const png = generatePng('?ring=72&rolling=30&pen=40,2.5,e63946'); // Uint8Array

// Segment-level render data (consumed by RN / React / Svelte etc. platform renderers)
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

## Pen semantics

`Pen.colors: string[]` — the pen's list of colors:
- **Exactly 1 color = solid pen** (`colors: ['#e63946']`)
- **≥ 2 colors = gradient pen**: cycles through colors along the curve at `spacing` (% of curve length) intervals
- `spacing` is ignored for solid pens; `segmentColor` / `buildRenderData` handle both semantics uniformly

## Curve sampling

- Inside (hypotrochoid): `x=(R−r)cos t + d·cos((R−r)/r·t)`, `y=(R−r)sin t − d·sin((R−r)/r·t)`
- Outside (epitrochoid): `x=(R+r)cos t − d·cos((R+r)/r·t)`, `y=(R+r)sin t − d·sin((R+r)/r·t)`
- Teeth share the same module, so radii are proportional to tooth counts; the closing period is `T=2π·q` (q = rolling teeth/gcd)
- Sampling cap `MAX_SAMPLES=150_000`; beyond that, auto-downsampling keeps the curve closed

## Build / publish

```bash
npm run build   # tsc -b → dist/ (ESM + .d.ts)
npm pack        # verify the tarball locally
```

`exports` subpaths: `.` (pure), `./browser` (Canvas rendering). `sideEffects: false` enables tree-shaking.
