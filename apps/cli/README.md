# @spirograph/cli

万花尺图案生成 CLI：把 URL query（或 JSON）直接生成 PNG / SVG 文件。基于 [`@spirograph/core`](https://www.npmjs.com/package/@spirograph/core)，无其他运行时依赖。

## 安装

```bash
npm install -g @spirograph/cli   # 或 npx @spirograph/cli
```

## 用法

```bash
spirograph generate --params "ring=72&rolling=30&pen=40,2.5,e63946&pen=75,2,1d6fa5" --format png --size 2048 --out out.png
spirograph generate --params "ring=72&rolling=30&pen=40,2.5,10,e63946,1d6fa5,f4a261" --format svg --out out.svg
spirograph generate --json '{"ringTeeth":72,"rollingTeeth":30,"pens":[{"hole":40,"colors":["#e63946"],"width":2.5}]}' --format png
spirograph --help
```

| 选项 | 说明 |
|---|---|
| `--params <query>` | URL query（与 web 分享链接 / 图片端点同一格式） |
| `--json <json>` | AppState JSON（优先于 --params） |
| `--format <fmt>` | `png` / `svg`（默认 png） |
| `--size <n>` | PNG 尺寸 64–4096（默认 1000） |
| `--out <path>` | 输出路径（默认 `spirograph.<fmt>`） |

## 开发

```bash
npm run build   # tsc -b → dist/cli.js（bin: spirograph）
node dist/cli.js generate --params "ring=72&rolling=30&pen=40,2.5,e63946"
```