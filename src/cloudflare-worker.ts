import { render } from './entry-server';
import { handleApiRequest, generateSitemapXml, CfEnv } from './cf-api';

const STATIC_EXTENSIONS = /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|webp|avif|map|json|txt|xml)$/i;

export default {
  async fetch(request: Request, env: CfEnv): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // API routes → edge handler
    if (url.pathname.startsWith('/api/')) {
      const res = await handleApiRequest(request, env);
      const headers = new Headers(res.headers);
      headers.set('Access-Control-Allow-Origin', '*');
      return new Response(res.body, { status: res.status, headers });
    }

    // Robots.txt
    if (url.pathname === '/robots.txt') {
      return new Response('User-agent: *\nAllow: /\nSitemap: https://testarena.ai/sitemap.xml\n', {
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // Sitemap.xml → generate dynamically from DB
    if (url.pathname === '/sitemap.xml') {
      try {
        const xml = await generateSitemapXml(env);
        return new Response(xml, {
          headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
          },
        });
      } catch (err) {
        console.error('Sitemap generation error:', err);
        return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>', {
          status: 200,
          headers: { 'Content-Type': 'application/xml; charset=utf-8' },
        });
      }
    }

    // Static assets (JS, CSS, images etc.) → serve from ASSETS
    if (STATIC_EXTENSIONS.test(url.pathname) || url.pathname.startsWith('/assets/')) {
      const assetRes = await env.ASSETS.fetch(request);
      if (assetRes.status !== 404) return assetRes;
    }

    // SSR for all other paths
    try {
      const templateRes = await env.ASSETS.fetch(new Request(`${url.origin}/index.html`));
      const template = await templateRes.text();

      const fetcher = async (apiPath: string) => {
        const apiUrl = new URL(apiPath, url.origin);
        const apiReq = new Request(apiUrl.toString());
        const apiRes = await handleApiRequest(apiReq, env);
        if (!apiRes.ok) throw new Error(`API Error: ${apiRes.status}`);
        return apiRes.json();
      };

      const { html, head } = await render(url.pathname + url.search, fetcher);

      const finalHtml = template
        .replace('<!--app-head-->', head || '')
        .replace('<div id="root"></div>', `<div id="root">${html}</div>`);

      return new Response(finalHtml, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    } catch (e) {
      console.error('SSR error:', e);
      // SPA fallback — return the bare index.html so client-side routing takes over
      const templateRes = await env.ASSETS.fetch(new Request(`${url.origin}/index.html`));
      const template = await templateRes.text();
      return new Response(template, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }
  },
};
