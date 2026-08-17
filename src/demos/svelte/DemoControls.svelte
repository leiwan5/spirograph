<script lang="ts">
  import type { SpirographState } from '@spirograph/core';

  interface Props {
    state: SpirographState;
    onPatch?: (patch: Partial<SpirographState>) => void;
    onRandom?: () => void;
  }

  let { state, onPatch = () => {}, onRandom = () => {} }: Props = $props();

  const RING = [72, 96, 144, 192];
  const ROLLING = [24, 30, 32, 45, 48, 52, 60, 63, 64, 72];

  function ringMax(): number {
    return state.mode === 'inside' ? state.ringTeeth - 1 : 96;
  }
</script>

<div class="demo-controls">
  <div class="demo-control">
    <span>Mode</span>
    <div style="display:flex;gap:6px">
      <button
        class="demo-action {state.mode === 'inside' ? 'active' : ''}"
        onclick={() => onPatch({ mode: 'inside' })}
      >Inside</button>
      <button
        class="demo-action {state.mode === 'outside' ? 'active' : ''}"
        onclick={() => onPatch({ mode: 'outside' })}
      >Outside</button>
    </div>
    <span></span>
  </div>

  <div class="demo-control">
    <span>Ring teeth</span>
    <input
      type="range"
      min="40"
      max="240"
      step="1"
      value={state.ringTeeth}
      oninput={(e) => onPatch({ ringTeeth: Number((e.currentTarget as HTMLInputElement).value) })}
    />
    <b>{state.ringTeeth}</b>
  </div>
  <div class="demo-control">
    <span>Rolling teeth</span>
    <input
      type="range"
      min="8"
      max={ringMax()}
      step="1"
      value={state.rollingTeeth}
      oninput={(e) => onPatch({ rollingTeeth: Number((e.currentTarget as HTMLInputElement).value) })}
    />
    <b>{state.rollingTeeth}</b>
  </div>

  <div class="demo-chips">
    {#each RING as r}
      <button class="demo-chip" onclick={() => onPatch({ ringTeeth: r })}>ring {r}</button>
    {/each}
  </div>
  <div class="demo-chips">
    {#each ROLLING as rr}
      <button class="demo-chip" onclick={() => onPatch({ rollingTeeth: Math.min(rr, ringMax()) })}>roll {rr}</button>
    {/each}
  </div>

  <div style="display:flex;justify-content:flex-end;gap:8px">
    <button class="demo-action" onclick={onRandom}><i class="fa-solid fa-shuffle"></i> Random</button>
  </div>
</div>
