# Spirograph 生成器 · Monorepo

浏览器即开即用的 Spirograph 图案生成器（中文界面）+ **跨平台万花尺图形生成库**（npm workspaces 单仓库）。

```
packages/core/    @spirograph/core   纯核心库：数学/几何/渐变/线段渲染契约/SVG/PNG，零 DOM/Node 依赖
packages/anim/    @spirograph/anim   可选动画驱动库（可注入帧调度器），配合 core 使用
apps/cli/         @spirograph/cli    CLI：query/JSON → PNG/SVG 文件（bin: spirograph）
src/  api/  functions/               web 应用（根目录，Vercel/CF 部署配置保留）
```

## 功能

- **齿轮规格**：环形齿轮 40–240 齿、滚动齿轮 8–96 齿（含经典快捷值），内切 / 外切两种模式
- **多笔叠加**：任意数量笔，每支独立配置孔洞（滚动半径 0–100%）、颜色、粗细（0.5–8px）
- **两种缩放模式**：
  - 固定图像大小：图案始终充满画布
  - 环固定大小：齿轮环在画布上大小恒定，图案按真实比例画在环内（调孔洞不影响其他笔）
- **模拟绘制动画**：笔尖逐段绘制，速度 0.1–10×，可暂停 / 继续
- **导出**：高清 PNG（2048px）与 SVG
- **预设与随机**：7 组经典齿轮组合一键套用，随机灵感按钮
- **URL 分享**：全部参数经 querystring 传递，复制地址栏即可分享当前图案

## 开发

```bash
npm install
npm run dev          # 开发服务器 http://localhost:5173
npm test             # 构建 packages + Vitest 单元测试（60+）
npm run build        # 构建 packages + 类型检查 + 生产构建 → dist/
npm run check:purity # 纯度守卫：核心库零平台依赖检查
npm run build:cli    # 构建 CLI
```

## 库的使用（@spirograph/core）

```ts
import { parseState, buildItems, buildSvg, generatePng } from '@spirograph/core';

const state = parseState('?ring=72&rolling=30&pen=40,e63946,2.5');
const items = buildItems({ ...defaults, ...state });   // 见 DEFAULT_STATE
const svg   = buildSvg(items, '#ffffff', 1024);        // SVG 字符串
const png   = generatePng('?ring=72&rolling=30&pen=40,e63946,2.5'); // PNG 字节

// 浏览器 Canvas 渲染（./browser 子路径）
import { renderFull, clearCanvas } from '@spirograph/core/browser';
const ctx = clearCanvas(canvas, 800, 800, '#ffffff', window.devicePixelRatio || 1);
renderFull(ctx, items, computeTransform(computeBounds(items.map(i => i.curve)), 800, 800, 32));
```

说明：
- `.` 入口 = 纯逻辑（可作为 npm 包发布，浏览器/Node/RN(Hermes)/Serverless 通用）
- `./browser` 入口 = Canvas 2D 渲染（最小结构化接口，不依赖 DOM lib）
- 渐变颜色在核心统一解析（`buildRenderData` 逐段取色）→ Canvas / SVG / PNG 三端颜色决策一致
- URL 编解码为内置纯字符串 codec（不依赖 URLSearchParams / TextEncoder）

## CLI

```bash
npx @spirograph/cli generate --params "ring=72&rolling=30&pen=40,e63946,2.5" --format png --size 2048 --out out.png
npx @spirograph/cli generate --params "…" --format svg --out out.svg
npx @spirograph/cli generate --json '{"ringTeeth":72,"rollingTeeth":30,"pens":[{"hole":40,"color":"#e63946","width":2.5}]}'
```

## 未来扩展位（未实现）

- `@spirograph/react-native`（react-native-svg 适配）、`@spirograph/react`、`@spirograph/svelte`：依赖 core 的薄封装
- 消费契约：`RenderData`（线段级数据）、`createFramePlan`（帧计划）、`generatePng/generateSvg`（序列化）

## URL 参数

`?ring=144&rolling=60&mode=inside&pen=40,3a86ff,1.8&pen=70,00bbf9,1.5&bg=1b1b2f&speed=2.5&scale=fixed`

| 参数 | 含义 | 范围 |
|---|---|---|
| `ring` | 环形齿轮齿数 | 40–240 |
| `rolling` | 滚动齿轮齿数 | 8–96 |
| `mode` | 绘制模式 | `inside` / `outside` |
| `pen` | 一支笔：孔洞,颜色,粗细（可重复）；渐变笔：`孔洞,起始色,粗细,间距,附加色1[,附加色2[,附加色3]]`（总色数 2–4，间距为渐变间隔 %） | 孔洞 0–100 / 粗细 0.5–8 / 间距 1–100 |
| `bg` | 背景色 | 6 位 hex（无 #） |
| `speed` | 动画速度 | 0.1–10 |
| `scale` | 缩放模式 | `auto` / `fixed` |
| `gears` | 显示齿轮动画（多笔分步绘制） | `1` / `0` |

非法参数自动忽略回退默认值；内切时滚动齿数 ≥ 环形齿数会自动夹取。

## 数学

- 内切（hypotrochoid）：x=(R−r)cos t + d·cos((R−r)/r·t)，y=(R−r)sin t − d·sin((R−r)/r·t)
- 外切（epitrochoid）：x=(R+r)cos t − d·cos((R+r)/r·t)，y=(R+r)sin t − d·sin((R+r)/r·t)
- 齿数同模数，半径与齿数成正比；闭合周期 T=2π·q（q = 滚动齿数/gcd）

## 图片端点（format=png/svg）

URL 带 `format=png` 或 `format=svg` 时直接返回图片（可被 `<img>` 引用、右键保存）：

```
http://localhost:5173/api/image?ring=72&rolling=30&pen=40,e63946,2.5&format=png&size=2048
http://localhost:5173/?ring=72&rolling=30&format=svg
```

- 参数与主应用 URL 一致（ring/rolling/mode/pen/bg/scale/speed 等），额外支持 `size`（64–4096，默认 1000）
- 开发环境：Vite 中间件（`/?format=` 与 `/api/image` 均可）
- 生产部署：Serverless 函数（Vercel `api/image.ts` / Cloudflare Pages `functions/api/image.ts`），PNG 编码为纯 JS（pako），无原生依赖
- 实现全部来自 `@spirograph/core` 的 `generateSvg/generatePng`（query → 图片，与 CLI 同源）

### 部署到 Vercel

1. 推送仓库到 GitHub，在 Vercel 导入项目（Framework: Vite）
2. `api/image.ts` 自动成为 `/api/image` 端点，静态站点照常托管
3. 图片 URL：`https://你的域名/api/image?...&format=png`

### 部署到 Cloudflare Pages

1. 构建命令 `npm run build`，输出目录 `dist`
2. `functions/` 目录自动成为 Pages Functions，`/api/image` 端点生效
3. 图片 URL：`https://你的域名/api/image?...&format=png`

## 目录结构

```
packages/core/src/   核心库（纯）：
  math/               齿轮化简、曲线采样
  geometry.ts         包围盒 / 变换
  gradient.ts         渐变取色（三端统一）
  pattern.ts          盘面孔阵
  pose.ts             齿轮位姿、分步进度
  segments.ts         线段级渲染契约 buildRenderData（统一颜色决策）
  svg.ts              SVG 字符串
  png.ts              光栅 + PNG 编码
  query.ts            URL codec
  image.ts            query → PNG/SVG（图片端点 / CLI 同源）
  browser.ts          Canvas 2D 渲染（./browser 子路径入口）
packages/anim/src/    动画驱动：FrameScheduler / DrawAnimation / createFramePlan
apps/cli/src/         CLI：generate 命令
src/                  web 应用：main / state / ui / render(导出胶水)
scripts/              无头浏览器验证脚本（playwright-core）+ 纯度守卫
```
