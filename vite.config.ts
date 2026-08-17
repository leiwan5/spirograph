import { defineConfig } from 'vite';
import type { Plugin, Connect } from 'vite';

/** Intercept ?format=png|svg requests and return the image directly (usable in <img>, saveable via right-click) */
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
    // support both /?format=png|svg and /api/image?format=png|svg endpoints
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
      .ssrLoadModule('@spirograph/core')
      .then((mod: { generatePng?: (s: string) => Uint8Array; generateSvg?: (s: string) => string }) => {
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
        console.error('[spirograph-image] generation failed:', err);
        res.statusCode = 500;
        res.end('image generation failed');
      });
  };
}

export default defineConfig({
  plugins: [spirographImagePlugin()],
  // base is inferred from the environment variable, for GitHub Pages subpath deploys (e.g. /spirograph/).
  // Local dev/preview uses the relative path './'; CI passes the repo-name subpath via BASE_URL.
  base: process.env.BASE_URL || './',
  server: { port: 5173, open: false },
  build: { target: 'es2022' },
});
