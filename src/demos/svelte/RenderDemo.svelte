<script lang="ts">
  import type { AppState } from '@spirograph/core';
  import { SpirographCanvas } from '@spirograph/svelte';
  import type { SpirographControl } from '@spirograph/svelte';
  import { applyPatch, buildDemoState, randomize } from '../state.js';
  import DemoCard from './DemoCard.svelte';
  import DemoControls from './DemoControls.svelte';

  let state: AppState = $state(buildDemoState());
  let control: SpirographControl = $state({});

  function patch(p: Partial<AppState>) {
    state = applyPatch(state, p);
  }
  function random() {
    state = randomize(state);
  }
</script>

<DemoCard title="Render-only" tag="&lt;SpirographCanvas&gt;">
  {#snippet stage()}
    <SpirographCanvas {state} {control} />
  {/snippet}

  {#snippet toolbar()}
    <button class="demo-action" onclick={() => control.exportPng?.()}>
      <i class="fa-solid fa-download"></i> PNG
    </button>
    <button class="demo-action" onclick={() => control.exportSvg?.()}>
      <i class="fa-solid fa-download"></i> SVG
    </button>
    <span style="flex:1"></span>
    <span style="font-size:12px;color:var(--muted)">
      {state.pens.length} pen{state.pens.length > 1 ? 's' : ''} · {state.ringTeeth}×{state.rollingTeeth}
    </span>
  {/snippet}

  {#snippet controls()}
    <DemoControls {state} onPatch={patch} onRandom={random} />
  {/snippet}
</DemoCard>
