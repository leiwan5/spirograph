/**
 * 平台通用全局的最小声明（无 DOM lib 编译）：
 * console / performance / setTimeout / clearTimeout 在浏览器、Node、RN 均存在。
 * rAF/cancelAF 由 scheduler.ts 声明并运行时探测。
 */
declare const console: {
  error(...data: unknown[]): void;
  log(...data: unknown[]): void;
  warn(...data: unknown[]): void;
};

declare const performance: { now(): number };

declare function setTimeout(cb: (...args: never[]) => void, ms?: number): unknown;
declare function clearTimeout(id: unknown): void;
