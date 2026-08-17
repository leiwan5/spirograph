<script lang="ts">
  import type { SpirographState } from '@spirograph/core';
  import { SpirographAnimated } from '@spirograph/svelte';
  import type { SpirographAnimationControl, PlayMode } from '@spirograph/svelte';
  import { applyPatch, buildDemoState, randomize } from '../state.js';
  import DemoCard from './DemoCard.svelte';
  import DemoControls from './DemoControls.svelte';

  let state: SpirographState = $state(buildDemoState());
  let control: SpirographAnimationControl = $state({});
  let playMode: PlayMode = $state('sequential');
  let gears = $state(false);

  function patch(p: Partial<SpirographState>) {
    state = applyPatch(state, p);
  }
  function random() {
    state = randomize(state);
  }
  function toggleGears() {
    gears = !gears;
    state = applyPatch(state, { showGears: gears });
  }
</script>

<DemoCard title="Animated & controllable" tag="&lt;SpirographAnimated&gt;">
  {#snippet stage()}
    <SpirographAnimated {state} {control} playMode={playMode} />
  {/snippet}

  {#snippet toolbar()}
    <button class="demo-action" onclick={() => control.play?.()}>
      <i class="fa-solid fa-play"></i> Play
    </button>
    <button class="demo-action" onclick={() => control.pause?.()}>
      <i class="fa-solid fa-pause"></i> Pause
    </button>
    <button class="demo-action" onclick={() => control.resume?.()}>
      <i class="fa-solid fa-forward"></i> Resume
    </button>
    <button class="demo-action" onclick={() => control.stop?.()}>
      <i class="fa-solid fa-stop"></i> Stop
    </button>
    <button class="demo-action" onclick={() => control.setSpeed?.(0.5)}>0.5×</button>
    <button class="demo-action" onclick={() => control.setSpeed?.(1)}>1×</button>
    <button class="demo-action" onclick={() => control.setSpeed?.(2)}>2×</button>
    <span style="flex:1"></span>
    <button class="demo-action {gears ? 'active' : ''}" onclick={toggleGears}>
      <i class="fa-solid fa-gear"></i> Gears
    </button>
    <button
      class="demo-action {playMode === 'simultaneous' ? 'active' : ''}"
      onclick={() => {
        playMode = playMode === 'sequential' ? 'simultaneous' : 'sequential';
      }}
    >
      {playMode === 'sequential' ? 'One pen' : 'All pens'}
    </button>
  {/snippet}

  {#snippet controls()}
    <DemoControls {state} onPatch={patch} onRandom={random} />
  {/snippet}
</DemoCard>
