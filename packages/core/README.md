# @spirograph/core

跨平台万花尺（Spirograph）图案生成核心库。**零 DOM / 零 Node 依赖**，同一套代码可在浏览器、Node.js、React Native（Hermes）、Vercel / Cloudflare Workers 运行。

- 纯数学：齿轮化简、曲线采样（hypotrochoid / epitrochoid）
- 几何：包围盒、居中变换
- 渐变取色：三端统一（Canvas / SVG / PNG 颜色决策一致）
- **线段级渲染契约** `buildRenderData`：坐标已变换、颜色已解析，各平台渲染器直接消费
- SVG 字符串 / PNG 字节（pako 纯 JS 编码，无 TextEncoder / URLSearchParams 依赖）

## 安装

```bash
npm install @spirograph/core
```

## 使用

```ts
import { DEFAULT_STATE, parseState, buildItems, buildSvg, generatePng } from '@spirograph/core';

// 从 URL query 解析（与 web 分享链接 / 图片端点同一格式）
const patch = parseState('?ring=72&rolling=30&pen=40,e63946,2.5&pen=75,1d6fa5,2');
const items = buildItems({ ...DEFAULT_STATE, ...patch, pens: patch.pens ?? DEFAULT_STATE.pens });

// SVG 字符串
const svg = buildSvg(items, '#ffffff', 2048);

// PNG 字节（Node / Serverless / 浏览器均可，纯 JS）
const png = generatePng('?ring=72&rolling=30&pen=40,e63946,2.5'); // Uint8Array

// 线段级渲染数据（RN / React / Svelte 等平台渲染器消费）
import { computeBounds, computeTransform, buildRenderData } from '@spirograph/core';
const t = computeTransform(computeBounds(items.map(i => i.curve)), 800, 800, 32);
const data = buildRenderData(items, t); // { segments, pens }
```

### 浏览器 Canvas 渲染（`@spirograph/core/browser`）

```ts
import { clearCanvas, renderFull } from '@spirograph/core/browser';
import { computeBounds, computeTransform } from '@spirograph/core';

const ctx = clearCanvas(canvas, 800, 800, '#ffffff', window.devicePixelRatio || 1);
const t = computeTransform(computeBounds(items.map(i => i.curve)), 800, 800, 32);
renderFull(ctx, items, t);
```

## 曲线采样

- 内切（hypotrochoid）：`x=(R−r)cos t + d·cos((R−r)/r·t)`，`y=(R−r)sin t − d·sin((R−r)/r·t)`
- 外切（epitrochoid）：`x=(R+r)cos t − d·cos((R+r)/r·t)`，`y=(R+r)sin t − d·sin((R+r)/r·t)`
- 齿数同模数，半径与齿数成正比；闭合周期 `T=2π·q`（q = 滚动齿数/gcd）
- 采样上限 `MAX_SAMPLES=150_000`，超出自动降采样保闭合

## 打包/发布

```bash
npm run build   # tsc -b → dist/（ESM + .d.ts）
npm pack        # 本地验证发布物
```

`exports` 子路径：`.`（纯）、`./browser`（Canvas 渲染）。`sideEffects: false` 支持 tree-shaking。