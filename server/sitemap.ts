import { Request, Response } from 'express';
import { db } from './db.js';
import { tests } from './schema.js';

const DOMAIN = 'https://testarena.ai';

const examSlugs = [
  'ssc-cgl', 'ssc-chsl', 'ssc-mts', 'ssc-gd', 'ssc-cpo',
  'railway-rrb-ntpc', 'railway-rrb-group-d', 'railway-rrb-je',
  'upsc-cse', 'upsc-csat', 'upsc-nda', 'upsc-cds',
  'ibps-po', 'ibps-clerk', 'sbi-po', 'sbi-clerk', 'rbi-grade-b',
  'gate-cs', 'ugc-net', 'neet', 'jee-main', 'jee-advanced',
  'cat', 'clat', 'ctet', 'kvs', 'nda',
];

const LANGUAGES = ['en', 'hi', 'bn', 'te', 'mr', 'ta', 'ur', 'gu', 'kn', 'ml'];

export async function sitemapHandler(_req: Request, res: Response) {
  try {
    const allTests = await db.select().from(tests);
    
    const urls = [
      { loc: `${DOMAIN}/`, priority: '1.0', changefreq: 'daily' },
      { loc: `${DOMAIN}/discovery`, priority: '0.9', changefreq: 'hourly' },
      ...examSlugs.map((slug) => ({
        loc: `${DOMAIN}/exam/${slug}`,
        priority: '0.8',
        changefreq: 'weekly',
      })),
    ];

    // Add tests and their language variants
    for (const test of allTests) {
      const slug = `${test.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${test.id}`;
      
      // Add default English version
      urls.push({
        loc: `${DOMAIN}/test-arena/${slug}`,
        priority: '0.7',
        changefreq: 'weekly',
      });
      
      // Add other language variants
      for (const lang of LANGUAGES) {
        if (lang !== 'en') {
          urls.push({
            loc: `${DOMAIN}/test-arena/${slug}?lang=${lang}`,
            priority: '0.6',
            changefreq: 'weekly',
          });
        }
      }
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.map((u) => {
  // If it's a test URL, add hreflang links
  if (u.loc.includes('/test-arena/')) {
    const baseUrl = u.loc.split('?')[0];
    const hreflangs = LANGUAGES.map(lang => 
      `      <xhtml:link rel="alternate" hreflang="${lang}" href="${baseUrl}${lang === 'en' ? '' : `?lang=${lang}`}" />`
    ).join('\n');
    
    return `  <url>
    <loc>${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
${hreflangs}
  </url>`;
  }
  
  return `  <url>
    <loc>${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`;
}).join('\n')}
</urlset>`;

    res.set('Content-Type', 'application/xml').send(xml);
  } catch (err) {
    console.error('Error generating sitemap:', err);
    res.status(500).send('Error generating sitemap');
  }
}
