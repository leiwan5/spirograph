// Ambient type for Svelte 5 components imported from TypeScript (used by the demo entry + root tsc).
declare module '*.svelte' {
  import type { Component, ComponentProps } from 'svelte';
  const component: Component<Record<string, never>> | Component<ComponentProps<never>>;
  export default component;
  export {};
}
