# @spirograph/cli

Spirograph pattern generation CLI: turns a URL query (or JSON) directly into PNG / SVG files. Built on [`@spirograph/core`](https://www.npmjs.com/package/@spirograph/core), no other runtime dependencies.

## Install

```bash
npm install -g @spirograph/cli   # or npx @spirograph/cli
```

## Usage

```bash
spirograph generate --params "ring=72&rolling=30&pen=40,2.5,e63946&pen=75,2,1d6fa5" --format png --size 2048 --out out.png
spirograph generate --params "ring=72&rolling=30&pen=40,2.5,10,e63946,1d6fa5,f4a261" --format svg --out out.svg
spirograph generate --json '{"ringTeeth":72,"rollingTeeth":30,"pens":[{"hole":40,"colors":["#e63946"],"width":2.5}]}' --format png
spirograph --help
```

| Option | Description |
|---|---|
| `--params <query>` | URL query (same format as web share links / image endpoints) |
| `--json <json>` | SpirographState JSON (takes precedence over --params) |
| `--format <fmt>` | `png` / `svg` (default png) |
| `--size <n>` | PNG size 64–4096 (default 1000) |
| `--out <path>` | output path (default `spirograph.<fmt>`) |

## Development

```bash
npm run build   # tsc -b → dist/cli.js (bin: spirograph)
node dist/cli.js generate --params "ring=72&rolling=30&pen=40,2.5,e63946"
```
