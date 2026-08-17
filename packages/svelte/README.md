# @spirograph/svelte

Svelte 5 components for [Spirograph](https://github.com/your-org/spirograph-generator): a render-only canvas and an animated, controllable canvas, wrapping the pure [@spirograph/core](../core) math + [@spirograph/canvas](../canvas) Canvas 2D glue.

```bash
npm i @spirograph/svelte
```

## Render-only canvas

Draws the finished pattern from an `SpirographState`; exposes PNG/SVG export through a `control` object.

```svelte
<script lang="ts">
  import { SpirographCanvas } from '@spirograph/svelte';
  import { DEFAULT_STATE } from '@spirograph/core';

  let control = {};
  function savePng() { control.exportPng?.(); }
  function saveSvg() { control.exportSvg?.(); }
</script>

<div style="width:480px;height:480px">
  <SpirographCanvas {control} state={DEFAULT_STATE} />
</div>
<button on:click={savePng}>PNG</button>
<button on:click={saveSvg}>SVG</button>
```

## Animated, controllable canvas

Adds a simulated drawing animation + `play`/`pause`/`resume`/`stop`/`setSpeed` control through the `control` object.

```svelte
<script lang="ts">
  import { SpirographAnimated } from '@spirograph/svelte';
  import { DEFAULT_STATE } from '@spirograph/core';

  let control = {};
</script>

<div style="width:480px;height:480px">
  <SpirographAnimated {control} state={DEFAULT_STATE} playMode="sequential" />
</div>
<button on:click={() => control.play?.()}>Play</button>
<button on:click={() => control.pause?.()}>Pause</button>
<button on:click={() => control.resume?.()}>Resume</button>
<button on:click={() => control.stop?.()}>Stop</button>
```

## Props & API

| Component | Prop | Type | Default | Note |
|---|---|---|---|---|
| both | `state` | `SpirographState` | — | drawing state (see `@spirograph/core`) |
| both | `className` / `style` / `id` | — | — | passed to `<canvas>` |
| both | `control` | `SpirographControl` | — | mutable object filled with export methods |
| `SpirographAnimated` | `playMode` | `'sequential' \| 'simultaneous'` | `'sequential'` | one pen at a time / all together |
| `SpirographAnimated` | `baseDurationMs` | `number?` | derived | animation duration (constant pen speed by default) |
| `SpirographAnimated` | `segmentsPerSecond` | `number?` | `350` | target speed when duration is derived |
| `SpirographAnimated` | `onDone` | `() => void?` | — | fired when the animation completes |
| `SpirographAnimated` | `control` | `SpirographAnimationControl` | — | also exposes `play/pause/resume/stop/setSpeed` |

When `state` changes while animating, the animation stops and the static pattern is redrawn (same as the vanilla demo).
