# Spirograph Generator · Monorepo

A browser-ready Spirograph pattern generator (demo UI) + **cross-platform spirograph rendering library** (npm workspaces monorepo).

```
packages/core/    @spirograph/core   Pure core library: math / geometry / gradients / segment-level render contract / SVG / PNG, zero DOM/Node dependencies
packages/anim/    @spirograph/anim   Optional animation driver (injectable frame scheduler), used with core
apps/cli/         @spirograph/cli    CLI: query/JSON → PNG/SVG files (bin: spirograph)
src/  api/  functions/               web app (root, Vercel/CF deployment config retained)
```

## Features

- **Gear specs**: ring gear 40–240 teeth, rolling gear 8–96 teeth (with classic quick values), inside / outside modes
- **Multi-pen stacking**: any number of pens, each independently configured with hole (0–100% of rolling radius), color, width (0.5–8px)
- **Two scale modes**:
  - Fixed image size: pattern always fills the canvas
  - Fixed ring size: gear ring stays constant size on canvas, pattern drawn at true scale inside (hole changes do not affect other pens)
- **Simulated drawing animation**: pen tip draws segment by segment, speed 0.1–10×, pausable / resumable
- **Export**: high-res PNG (2048px) and SVG
- **Presets & random**: 7 classic gear combinations with one click, random inspiration button
- **URL sharing**: all parameters passed via querystring, copy the address bar to share the current pattern

## Development

```bash
npm install
npm run dev          # dev server http://localhost:5173
npm test             # build packages + Vitest unit tests (60+)
npm run build        # build packages + typecheck + production build → dist/
npm run check:purity # purity guard: core library zero platform-dependency check
npm run build:cli    # build CLI
```

## Using the library (@spirograph/core)

```ts
import { parseState, buildItems, buildSvg, generatePng } from '@spirograph/core';

const state = parseState('?ring=72&rolling=30&pen=40,e63946,2.5');
const items = buildItems({ ...defaults, ...state });   // see DEFAULT_STATE
const svg   = buildSvg(items, '#ffffff', 1024);        // SVG string
const png   = generatePng('?ring=72&rolling=30&pen=40,e63946,2.5'); // PNG bytes

// Browser Canvas rendering (./browser subpath)
import { renderFull, clearCanvas } from '@spirograph/core/browser';
const ctx = clearCanvas(canvas, 800, 800, '#ffffff', window.devicePixelRatio || 1);
renderFull(ctx, items, computeTransform(computeBounds(items.map(i => i.curve)), 800, 800, 32));
```

Notes:
- `.` entry = pure logic (publishable as an npm package; browser / Node / RN (Hermes) / Serverless)
- `./browser` entry = Canvas 2D rendering (minimal structural interface, no DOM lib dependency)
- Gradient colors are resolved centrally in core (`buildRenderData` resolves per-segment) → consistent color decisions across Canvas / SVG / PNG
- URL encode/decode is a built-in pure string codec (no dependency on URLSearchParams / TextEncoder)

## CLI

```bash
npx @spirograph/cli generate --params "ring=72&rolling=30&pen=40,e63946,2.5" --format png --size 2048 --out out.png
npx @spirograph/cli generate --params "…" --format svg --out out.svg
npx @spirograph/cli generate --json '{"ringTeeth":72,"rollingTeeth":30,"pens":[{"hole":40,"color":"#e63946","width":2.5}]}'
```

## Future expansion (not yet implemented)

- `@spirograph/react-native` (react-native-svg adapter), `@spirograph/react`, `@spirograph/svelte`: thin wrappers on core
- Consumed contracts: `RenderData` (segment-level data), `createFramePlan` (frame plan), `generatePng/generateSvg` (serialization)

## URL parameters

`?ring=144&rolling=60&mode=inside&pen=40,1.8,3a86ff&pen=70,1.5,10,00bbf9,f4a261&bg=1b1b2f&speed=2.5&scale=fixed`

| Param | Meaning | Range |
|---|---|---|
| `ring` | ring gear teeth | 40–240 |
| `rolling` | rolling gear teeth | 8–96 |
| `mode` | drawing mode | `inside` / `outside` |
| `pen` | one pen (repeatable): `hole,width,color1` = solid; `hole,width,spacing,color1[,color2[,color3[,color4]]]` = multi-color gradient (spacing comes before the color group, unambiguous with 6-digit hex). **1 color = solid, ≥ 2 colors = gradient** | hole 0–100 / width 0.5–8 / spacing 1–100 |
| `bg` | background color | 6-digit hex (no #) |
| `speed` | animation speed | 0.1–10 |
| `scale` | scale mode | `auto` / `fixed` |
| `gears` | show gear animation (pens drawn in sequence) | `1` / `0` |

Invalid parameters are silently ignored and fall back to defaults; when inside mode has rolling teeth ≥ ring teeth it is clamped automatically.

## Math

- Inside (hypotrochoid): x=(R−r)cos t + d·cos((R−r)/r·t), y=(R−r)sin t − d·sin((R−r)/r·t)
- Outside (epitrochoid): x=(R+r)cos t − d·cos((R+r)/r·t), y=(R+r)sin t − d·sin((R+r)/r·t)
- Teeth share the same module, so radii are proportional to tooth counts; the closing period is T=2π·q (q = rolling teeth/gcd)

## Image endpoint (format=png/svg)

A URL with `format=png` or `format=svg` returns the image directly (usable in `<img>` tags, saveable via right-click):

```
http://localhost:5173/api/image?ring=72&rolling=30&pen=40,e63946,2.5&format=png&size=2048
http://localhost:5173/?ring=72&rolling=30&format=svg
```

- Parameters match the main app URL (ring/rolling/mode/pen/bg/scale/speed, etc.), with extra support for `size` (64–4096, default 1000)
- Development: Vite middleware (both `/?format=` and `/api/image`)
- Production: Serverless functions (Vercel `api/image.ts` / Cloudflare Pages `functions/api/image.ts`), PNG encoding is pure JS (pako), no native dependencies
- Implementation all comes from `@spirograph/core`'s `generateSvg/generatePng` (query → image, same source as CLI)

### Deploying to Vercel

1. Push the repo to GitHub and import the project in Vercel (Framework: Vite)
2. `api/image.ts` automatically becomes the `/api/image` endpoint; the static site is hosted as usual
3. Image URL: `https://<your-domain>/api/image?...&format=png`

### Deploying to Cloudflare Pages

1. Build command `npm run build`, output directory `dist`
2. The `functions/` directory automatically becomes Pages Functions; the `/api/image` endpoint is enabled
3. Image URL: `https://<your-domain>/api/image?...&format=png`

### Deploying to GitHub Pages

GitHub Pages is pure static hosting and has **no** serverless functions, so the `/api/image` image endpoint is unavailable:
the frontend probes at runtime and automatically hides the "Copy image link" button; everything else works normally.

A `.github/workflows/deploy.yml` is included: on push to `main` it builds automatically and deploys to a subpath:

1. Repo Settings → Pages → Source select **GitHub Actions**
2. After pushing to `main`, Actions builds `dist/` and publishes (the first deploy requires a manual
   `workflow_dispatch` trigger)
3. Site URL: `https://<your-username>.github.io/<repo-name>/`

> Subpath resource references are injected via the build-time environment variable `BASE_URL` (see `.github/workflows/deploy.yml`),
> so renaming the repo requires no code changes. Local `npm run dev` / `npm run preview` use the relative
> path `./` by default and do not depend on that variable.

## Directory structure

```
packages/core/src/   core library (pure):
  math/              gear reduction, curve sampling
  geometry.ts        bounds / transform
  gradient.ts        gradient color sampling (unified across targets)
  pattern.ts         disc hole pattern
  pose.ts            gear pose, per-step progress
  segments.ts        segment-level render contract buildRenderData (unified color decision)
  svg.ts             SVG string
  png.ts             raster + PNG encoding
  query.ts           URL codec
  image.ts           query → PNG/SVG (same source as image endpoint / CLI)
  browser.ts         Canvas 2D rendering (./browser subpath entry)
packages/anim/src/   animation driver: FrameScheduler / DrawAnimation / createFramePlan
apps/cli/src/        CLI: generate command
src/                 web app: main / state / ui / render (export glue)
scripts/             headless browser verification scripts (playwright-core) + purity guard
```
