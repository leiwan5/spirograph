import { defineConfig } from 'vite';
import type { Plugin, Connect } from 'vite';

/** 拦截 ?format=png|svg 请求，直接返回图片（可被 <img> 引用、右键保存） */
function spirographImagePlugin(): Plugin {
  return {
    name: 'spirograph-image',
    configureServer(server) {
      server.middlewares.use(imageMiddleware(server));
    },
    configurePreviewServer(server) {
      server.middlewares.use(imageMiddleware(server));
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function imageMiddleware(server: any): Connect.NextHandleFunction {
  return (req, res, next) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const format = url.searchParams.get('format');
    const isImagePath = url.pathname === '/api/image';
    // 支持 /?format=png|svg 与 /api/image?format=png|svg 两种端点
    if ((!isImagePath && format !== 'png' && format !== 'svg') || (isImagePath && format !== 'png' && format !== 'svg')) {
      return next();
    }
    const search = url.search;
    if (!server?.ssrLoadModule) {
      res.statusCode = 500;
      res.end('image generation unavailable');
      return;
    }
    server
      .ssrLoadModule('/src/server/image.ts')
      .then((mod: { generatePng?: (s: string) => Buffer; generateSvg?: (s: string) => string }) => {
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.setHeader('Access-Control-Allow-Origin', '*');
        if (format === 'svg') {
          res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
          res.end(mod.generateSvg?.(search) ?? '');
        } else {
          res.setHeader('Content-Type', 'image/png');
          res.end(mod.generatePng?.(search) ?? Buffer.alloc(0));
        }
      })
      .catch((err: unknown) => {
        console.error('[spirograph-image] 生成失败:', err);
        res.statusCode = 500;
        res.end('image generation failed');
      });
  };
}

export default defineConfig({
  plugins: [spirographImagePlugin()],
  server: { port: 5173, open: false },
  build: { target: 'es2022' },
});
