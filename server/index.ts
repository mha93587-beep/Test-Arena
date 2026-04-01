import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import router from './routes.js';
import { sitemapHandler } from './sitemap.js';
import { initDb } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

const PORT = 3000;
const isDev = process.env.NODE_ENV !== 'production';

async function startServer() {
  await initDb();

  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // API routes
  app.use('/api', router);

  app.get('/api/test-server', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running new code' });
  });

  // Sitemap
  app.get('/sitemap.xml', sitemapHandler);

  // Robots.txt
  app.get('/robots.txt', (_req, res) => {
    res.type('text/plain').send(`User-agent: *\nAllow: /\nSitemap: https://testarena.ai/sitemap.xml\n`);
  });

  if (isDev) {
    // In dev mode, use Vite as middleware with SSR support
    const { createServer: createViteServer } = await import('vite');

    const vite = await createViteServer({
      root: ROOT,
      server: { middlewareMode: true },
      appType: 'custom',
    });

    app.use(vite.middlewares);

    app.use(async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = readFileSync(resolve(ROOT, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);

        let finalHtml = template.replace('<!--app-head-->', '');

        try {
          const { render } = await vite.ssrLoadModule('/src/entry-server.tsx');
          const fetcher = async (apiPath: string) => {
            const res = await fetch(`http://localhost:${PORT}${apiPath}`);
            if (!res.ok) throw new Error('API Error');
            return res.json();
          };
          const { html, head } = await render(url, fetcher);
          finalHtml = template
            .replace('<!--app-head-->', head || '')
            .replace('<div id="root"></div>', `<div id="root">${html}</div>`);
        } catch (ssrErr: any) {
          console.warn('[SSR] Falling back to SPA mode:', ssrErr.message);
          finalHtml = template.replace('<div id="root"></div>', `<div id="root">SSR ERROR: ${ssrErr.message}\n${ssrErr.stack}</div>`);
        }

        res.status(200).set({ 'Content-Type': 'text/html' }).end(finalHtml);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    // Production: serve built static files
    const { default: compression } = await import('compression');
    app.use(compression());
    app.use(express.static(resolve(ROOT, 'dist/client'), { index: false }));

    app.use(async (req, res, next) => {
      const url = req.originalUrl;
      try {
        const template = readFileSync(resolve(ROOT, 'dist/client/index.html'), 'utf-8');
        // @ts-ignore
        const { render } = await import(resolve(ROOT, 'dist/server/entry-server.js'));
        const fetcher = async (apiPath: string) => {
          const res = await fetch(`http://localhost:${PORT}${apiPath}`);
          if (!res.ok) throw new Error('API Error');
          return res.json();
        };
        const { html, head } = await render(url, fetcher);

        const finalHtml = template
          .replace('<!--app-head-->', head)
          .replace('<div id="root"></div>', `<div id="root">${html}</div>`);

        res.status(200).set({ 'Content-Type': 'text/html' }).end(finalHtml);
      } catch (e) {
        next(e);
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Test Arena server running at http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
