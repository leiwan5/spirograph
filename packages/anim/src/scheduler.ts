/**
 * 帧调度器：动画库唯一的平台依赖点。
 * 浏览器/RN 注入 rAF 调度器，Node 注入 timer 调度器，核心永远不触碰定时器。
 */

/** 帧调度接口：时间源 + 帧回调注册/取消 */
export interface FrameScheduler {
  now(): number;
  requestFrame(cb: (ts: number) => void): number;
  cancelFrame(id: number): void;
}

// 无 DOM lib 编译：仅声明我们用到的两个全局（存在性运行时探测）
declare global {
  // eslint-disable-next-line no-var
  var requestAnimationFrame: ((cb: (ts: number) => void) => number) | undefined;
  // eslint-disable-next-line no-var
  var cancelAnimationFrame: ((id: number) => void) | undefined;
}

/** 浏览器 / React Native：使用全局 requestAnimationFrame + performance.now */
export function rafScheduler(): FrameScheduler {
  return {
    now: () => (typeof performance !== 'undefined' ? performance.now() : Date.now()),
    requestFrame: (cb) => {
      if (typeof globalThis.requestAnimationFrame === 'function') {
        return globalThis.requestAnimationFrame(cb);
      }
      // 无 rAF 的环境降级为 ~16ms timer
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

/** Node：setTimeout ~16ms 降级调度 */
export function timerScheduler(intervalMs = 16): FrameScheduler {
  return {
    now: () => Date.now(),
    requestFrame: (cb) => setTimeout(() => cb(Date.now()), intervalMs) as unknown as number,
    cancelFrame: (id) => clearTimeout(id),
  };
}

/** 自动选择：有 rAF 用 rAF，否则 timer */
export function autoScheduler(): FrameScheduler {
  return typeof globalThis.requestAnimationFrame === 'function' ? rafScheduler() : timerScheduler();
}
