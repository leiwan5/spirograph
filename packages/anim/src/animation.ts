import type { FrameScheduler } from './scheduler.js';
import { autoScheduler } from './scheduler.js';

/**
 * Simulated drawing animation: calls back rendering by progress ratio, supports speed multiplier, pause/resume, and interrupt cleanup.
 * Driven by monotonic time; on pause it records elapsed time and recomputes on resume.
 * The scheduler is injectable (browser rAF / Node timer / RN rAF), defaulting to autoScheduler.
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
      // render error: stop the animation and fall back to the static image, keep the error visible for diagnosis
      console.error('[Spirograph] animation render error, stopped:', err);
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
