<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    tag?: string;
    stage: Snippet;
    toolbar?: Snippet;
    controls?: Snippet;
  }

  let { title, tag = '', stage, toolbar, controls }: Props = $props();
</script>

<div class="demo-card">
  <div class="demo-card-head">
    <span>{title}</span>
    {#if tag}
      <span class="tag">{tag}</span>
    {/if}
  </div>
  <div class="demo-stage">
    {@render stage()}
  </div>
  {#if toolbar}
    {@render toolbar()}
  {/if}
  {#if controls}
    {@render controls()}
  {/if}
</div>
