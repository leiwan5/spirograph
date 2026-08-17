/**
 * Frame scheduler: the animation library's only platform-dependency point.
 * Browser/RN inject an rAF scheduler, Node injects a timer scheduler, the core never touches timers.
 */

/** Frame scheduler interface: time source + frame callback register/cancel */
export interface FrameScheduler {
  now(): number;
  requestFrame(cb: (ts: number) => void): number;
  cancelFrame(id: number): void;
}

// No DOM-lib compilation: only declare the two globals we use (runtime presence detection)
declare global {
  // eslint-disable-next-line no-var
  var requestAnimationFrame: ((cb: (ts: number) => void) => number) | undefined;
  // eslint-disable-next-line no-var
  var cancelAnimationFrame: ((id: number) => void) | undefined;
}

/** browser / React Native: uses the global requestAnimationFrame + performance.now */
export function rafScheduler(): FrameScheduler {
  return {
    now: () => (typeof performance !== 'undefined' ? performance.now() : Date.now()),
    requestFrame: (cb) => {
      if (typeof globalThis.requestAnimationFrame === 'function') {
        return globalThis.requestAnimationFrame(cb);
      }
      // environments without rAF fall back to a ~16ms timer
      return setTimeout(() => cb(Date.now()), 16) as unknown as number;
    },
    cancelFrame: (id) => {
      if (typeof globalThis.cancelAnimationFrame === 'function') {
        globalThis.cancelAnimationFrame(id);
      } else {
        clearTimeout(id);
      }
    },
  };
}

/** Node: setTimeout ~16ms fallback scheduling */
export function timerScheduler(intervalMs = 16): FrameScheduler {
  return {
    now: () => Date.now(),
    requestFrame: (cb) => setTimeout(() => cb(Date.now()), intervalMs) as unknown as number,
    cancelFrame: (id) => clearTimeout(id),
  };
}

/** auto-select: use rAF when available, otherwise timer */
export function autoScheduler(): FrameScheduler {
  return typeof globalThis.requestAnimationFrame === 'function' ? rafScheduler() : timerScheduler();
}
