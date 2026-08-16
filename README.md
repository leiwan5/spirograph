# Spirograph 生成器

浏览器即开即用的 Spirograph 图案生成器（中文界面）。选择环形齿轮 / 滚动齿轮规格、孔洞位置、笔头颜色与粗细，多笔叠加生成复合图案，支持模拟绘制动画与 PNG/SVG 导出。

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
npm run dev        # 开发服务器 http://localhost:5173
npm test           # Vitest 单元测试
npm run build      # 类型检查 + 生产构建 → dist/
```

## URL 参数

`?ring=144&rolling=60&mode=inside&pen=40,3a86ff,1.8&pen=70,00bbf9,1.5&bg=1b1b2f&speed=2.5&scale=fixed`

| 参数 | 含义 | 范围 |
|---|---|---|
| `ring` | 环形齿轮齿数 | 40–240 |
| `rolling` | 滚动齿轮齿数 | 8–96 |
| `mode` | 绘制模式 | `inside` / `outside` |
| `pen` | 一支笔：孔洞,颜色,粗细（可重复）；渐变笔附 1-3 个渐变色；自定义渐变起点/长度时用新格式 `孔洞,颜色,粗细,起点,长度,色2[,...]` | 孔洞 0–100，颜色 6 位 hex（无 #），粗细 0.5–8，起点/长度 0–100 |
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
http://localhost:5273/api/image?ring=72&rolling=30&pen=40,e63946,2.5&format=png&size=2048
http://localhost:5273/?ring=72&rolling=30&format=svg
```

- 参数与主应用 URL 一致（ring/rolling/mode/pen/bg/scale/speed 等），额外支持 `size`（64–4096，默认 1000）
- 开发环境：Vite 中间件（`/?format=` 与 `/api/image` 均可）
- 生产部署：Serverless 函数（Vercel `api/image.ts` / Cloudflare Pages `functions/api/image.ts`），PNG 编码为纯 JS（pako），无原生依赖

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
src/
  math/      齿轮化简、曲线采样（含单测）
  render/    Canvas 渲染、SVG/PNG 导出
  state/     订阅式状态管理、URL 参数
  anim/      模拟绘制动画
  ui/        控件面板、预设、样式
scripts/      无头浏览器验证脚本（playwright-core）
```
