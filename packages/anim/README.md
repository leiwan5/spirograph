# @spirograph/anim

万花尺可选**动画驱动库**：负责"某个进度画多少"的帧计划计算与绘制动画的调度节奏。配合 [`@spirograph/core`](https://www.npmjs.com/package/@spirograph/core) 使用。

特点：
- **核心不污染**：动画所需的全部支持都在 core 的纯数据操作里（`buildRenderData` 的 `perPenLimit` 前缀截断、`computeSteps`、`computeGearPose`），本库只负责调度与帧计划，不往核心塞定时器/DOM。
- **可注入调度器**：浏览器 / RN 用 rAF，Node 用 setTimeout 降级；`FrameScheduler` 接口即插即用。
- **跨平台一致**：`createFramePlan` 是纯函数，浏览器 canvas 与未来 react-native-svg 消费同一份帧计划。

## 安装

```bash
npm install @spirograph/anim @spirograph/core
```

## 使用

```ts
import { createFramePlan, DrawAnimation, autoScheduler } from '@spirograph/anim';
import { buildItems, computeBounds, computeTransform, buildRenderData } from '@spirograph/core';

const items = buildItems(state);
const t = computeTransform(computeBounds(items.map(i => i.curve)), 800, 800, 32);

// 逐帧：某进度下每笔画多少（纯函数）
const plan = createFramePlan(items, 0.42, { step: true });
const data = buildRenderData(items, t, { perPenLimit: plan.perPenPoints.map(n => Math.max(0, n - 1)) });

// 驱动动画（调度器可注入）
const anim = new DrawAnimation(
  (progress) => renderFrame(createFramePlan(items, progress, { step: true })),
  () => renderFinal(),
  15_000,          // 基准时长 ms
  autoScheduler(), // 浏览器/RN rAF；Node 自动降级 timer
);
anim.setSpeed(2);
anim.start();
anim.pause(); anim.resume(); anim.stop();
```

### 调度器

| 调度器 | 平台 | 说明 |
|---|---|---|
| `rafScheduler()` | 浏览器 / RN | 全局 `requestAnimationFrame` + `performance.now`，无 rAF 时降级 ~16ms timer |
| `timerScheduler()` | Node | setTimeout 降级（约 16ms） |
| `autoScheduler()` | 任意 | 有 rAF 用 rAF，否则 timer（默认） |

## 打包/发布

```bash
npm run build   # tsc -b → dist/
```