# @spirograph/react

React components for [Spirograph](https://github.com/your-org/spirograph-generator): a render-only canvas and an animated, controllable canvas, wrapping the pure [@spirograph/core](../core) math + [@spirograph/canvas](../canvas) Canvas 2D glue.

```bash
npm i @spirograph/react
```

## Render-only canvas

Draws the finished pattern from an `AppState`; exposes PNG/SVG export through its ref handle.

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

Adds a simulated drawing animation + `play`/`pause`/`resume`/`stop`/`setSpeed` control through the ref.

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

## Props & API

| Component | Prop | Type | Default | Note |
|---|---|---|---|---|
| both | `state` | `AppState` | — | drawing state (see `@spirograph/core`) |
| both | `className` / `style` / `id` | — | — | passed to `<canvas>` |
| `SpirographAnimated` | `playMode` | `'sequential' \| 'simultaneous'` | `'sequential'` | one pen at a time / all together |
| `SpirographAnimated` | `baseDurationMs` | `number?` | derived | animation duration (constant pen speed by default) |
| `SpirographAnimated` | `segmentsPerSecond` | `number?` | `350` | target speed when duration is derived |
| `SpirographAnimated` | `onDone` | `() => void?` | — | fired when the animation completes |
| `SpirographAnimated` | `onPlayingChange` | `(playing) => void?` | — | fired when play state flips |

Ref handle: `exportPng(size?, filename?)`, `exportSvg(size?, filename?)`, and for the animated component `play()`, `pause()`, `resume()`, `stop()`, `setSpeed(speed)`.

When `state` changes while animating, the animation stops and the static pattern is redrawn (same as the vanilla demo).
