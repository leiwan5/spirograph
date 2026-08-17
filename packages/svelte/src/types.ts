/** Shared control/type definitions for @spirograph/svelte (plain TS, no .svelte dependency). */

/** Export methods filled into the `control` object by rendering components. */
export interface SpirographControl {
  exportPng?: (size?: number, filename?: string) => void;
  exportSvg?: (size?: number, filename?: string) => void;
}

export type PlayMode = 'sequential' | 'simultaneous';

/** Full control surface for the animated component (export + animation methods). */
export interface SpirographAnimationControl extends SpirographControl {
  play?: () => void;
  pause?: () => void;
  resume?: () => void;
  stop?: () => void;
  setSpeed?: (speed: number) => void;
}
