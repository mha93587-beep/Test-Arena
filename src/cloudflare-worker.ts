import { render } from './entry-server';
import { handleApiRequest, CfEnv } from './cf-api';

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

    // Static assets (JS, CSS, images etc.) → serve from ASSETS
    if (STATIC_EXTENSIONS.test(url.pathname) || url.pathname.startsWith('/assets/')) {
      const assetRes = await env.ASSETS.fetch(request);
      if (assetRes.status !== 404) return assetRes;
    }

    // Robots.txt / sitemap.xml → serve as plain text or from ASSETS
    if (url.pathname === '/robots.txt') {
      return new Response('User-agent: *\nAllow: /\nSitemap: https://testarena.ai/sitemap.xml\n', {
        headers: { 'Content-Type': 'text/plain' },
      });
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
