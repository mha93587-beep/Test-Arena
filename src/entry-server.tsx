import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { HelmetProvider, HelmetServerState } from 'react-helmet-async';
import { QueryClient, QueryClientProvider, dehydrate } from '@tanstack/react-query';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import AppRoutes from './AppRoutes';
import { extractIdFromSlug } from '@/lib/utils';

export async function render(url: string, fetcher?: (apiPath: string) => Promise<any>) {
  const helmetContext: { helmet?: HelmetServerState } = {};
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity } },
  });

  if (url.startsWith('/test-arena/')) {
    const slugWithQuery = url.split('/test-arena/')[1];
    const [slug, queryString] = slugWithQuery.split('?');
    const testId = extractIdFromSlug(slug);
    
    let lang = 'en';
    if (queryString) {
      const params = new URLSearchParams(queryString);
      lang = params.get('lang') || 'en';
    }

    if (testId && fetcher) {
      try {
        const data = await fetcher(`/api/tests/${testId}?lang=${lang}`);
        queryClient.setQueryData([`/api/tests/${testId}?lang=${lang}`], data);
      } catch (e) {
        console.error("Failed to prefetch test data", e);
      }
    }
  }

  const html = renderToString(
    <HelmetProvider context={helmetContext}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <StaticRouter location={url}>
            <AppRoutes />
          </StaticRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );

  const { helmet } = helmetContext;
  const head = helmet
    ? `${helmet.title.toString()}${helmet.meta.toString()}${helmet.link.toString()}`
    : '';

  const dehydratedState = dehydrate(queryClient);
  const stateHtml = `<script>window.__REACT_QUERY_STATE__ = ${JSON.stringify(dehydratedState).replace(/</g, '\\u003c')};</script>`;

  return { html: html + stateHtml, head };
}
