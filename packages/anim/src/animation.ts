import type { FrameScheduler } from './scheduler.js';
import { autoScheduler } from './scheduler.js';

/**
 * 模拟绘制动画：按进度比例回调渲染，支持速度倍率、暂停/恢复、中断清理。
 * 采用单调时间驱动，暂停时记录已消耗时间，恢复后续算。
 * 调度器可注入（浏览器 rAF / Node timer / RN rAF），默认 autoScheduler。
 */
export class DrawAnimation {
  private rafId = 0;
  private running = false;
  private paused = false;
  private elapsed = 0;
  private lastTs = 0;
  private speed = 1;
  private baseDurationMs: number;
  private scheduler: FrameScheduler;

  constructor(
    private tick: (progress: number) => void,
    private onDone: () => void,
    baseDurationMs = 20_000,
    scheduler: FrameScheduler = autoScheduler(),
  ) {
    this.baseDurationMs = baseDurationMs;
    this.scheduler = scheduler;
  }

  get isRunning(): boolean {
    return this.running;
  }

  get isPaused(): boolean {
    return this.paused;
  }

  setSpeed(speed: number): void {
    this.speed = speed;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.paused = false;
    this.elapsed = 0;
    this.lastTs = this.scheduler.now();
    this.rafId = this.scheduler.requestFrame(this.frame);
  }

  pause(): void {
    if (!this.running || this.paused) return;
    this.paused = true;
    this.scheduler.cancelFrame(this.rafId);
  }

  resume(): void {
    if (!this.running || !this.paused) return;
    this.paused = false;
    this.lastTs = this.scheduler.now();
    this.rafId = this.scheduler.requestFrame(this.frame);
  }

  stop(): void {
    this.running = false;
    this.paused = false;
    if (this.rafId) this.scheduler.cancelFrame(this.rafId);
    this.rafId = 0;
  }

  private frame = (ts: number): void => {
    if (!this.running || this.paused) return;
    const dt = ts - this.lastTs;
    this.lastTs = ts;
    this.elapsed += dt * this.speed;
    const progress = Math.min(1, this.elapsed / this.baseDurationMs);
    try {
      this.tick(progress);
    } catch (err) {
      // 渲染异常：停止动画并回退静态图，错误可见便于诊断
      console.error('[Spirograph] 动画渲染异常，已停止：', err);
      this.stop();
      this.onDone();
      return;
    }
    if (progress >= 1) {
      this.stop();
      this.onDone();
      return;
    }
    this.rafId = this.scheduler.requestFrame(this.frame);
  };
}
