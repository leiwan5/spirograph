# Spirograph Expo Demo

An [Expo](https://expo.dev) (React Native) demo app for the
[`@spirograph/react-native`](../../packages/react-native) library. It renders
interactive spirograph patterns (hypotrochoids & epitrochoids) with live
parameter controls and a play/pause/stop drawing animation.

## What it demonstrates

- **`<SpirographSvg>`** — static SVG rendering of the finished pattern.
- **`<SpirographAnimated>`** — animated drawing with an imperative
  `play / pause / resume / stop / setSpeed` handle (backed by
  [`@spirograph/anim`](../../packages/anim)).
- **Pattern controls** — inside/outside mode, ring & rolling teeth, show-gears
  toggle, animation speed, background color.
- **Pen editor** — add/remove pens, adjust hole position, line width and color.

## Prerequisites

- Node.js 20+
- The monorepo packages built: from the repo root run
  `npm run build:packages`
- [Expo Go](https://expo.dev/go) on a device, or an iOS/Android simulator, or use
  the web target.

## Running

From the repo root, install dependencies (Expo and native packages):

```sh
# build the @spirograph/* workspace packages first
npm run build:packages
npm install
```

Then start the demo:

```sh
cd apps/expo-demo
npx expo start
```

Scan the QR code with Expo Go, or press:

- `a` — open on Android (emulator/device)
- `i` — open on iOS simulator
- `w` — open in your browser (web is also supported via `react-native-svg`)

## Publishing as an Expo Snack (embed on the docs page)

The `react-native.html` docs page embeds this demo as an **Expo Snack**. A
self-contained, upload-ready copy lives in **`snack/`** in this directory — see
[`snack/README.md`](snack/README.md) for the publish steps and how to plug the
resulting snack id into `src/demos/react-native/snackConfig.ts`.

## Notes

- This demo is a workspace member of the monorepo. `metro.config.js` is set up
  to watch and resolve the `@spirograph/*` packages at `../../packages`.
- TypeScript resolves the workspace packages to their `dist` outputs via the
  `paths` mapping in `tsconfig.json` — make sure you run `build:packages` (or
  `tsc -b packages/core packages/anim packages/react-native`) after changing any
  package source.
- Share / export (save the pattern as an image) is not yet implemented; the
  [library](../../packages/react-native) exposes the render data if you'd like
  to add it with `expo-sharing` + `expo-file-system`.

## Files

```
app/
  _layout.tsx        # Expo Router root layout (dark theme)
  index.tsx          # Main screen: canvas + playback + controls
components/
  SpirographControls.tsx  # Pattern & pen parameter controls
constants/
  state.ts           # Default demo state + color palettes
```
