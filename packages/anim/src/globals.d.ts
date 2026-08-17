/**
 * Minimal declarations of platform-common globals (no DOM-lib compilation):
 * console / performance / setTimeout / clearTimeout exist in browser, Node, and RN.
 * rAF/cancelAF are declared in scheduler.ts and detected at runtime.
 */
declare const console: {
  error(...data: unknown[]): void;
  log(...data: unknown[]): void;
  warn(...data: unknown[]): void;
};

declare const performance: { now(): number };

declare function setTimeout(cb: (...args: never[]) => void, ms?: number): unknown;
declare function clearTimeout(id: unknown): void;
