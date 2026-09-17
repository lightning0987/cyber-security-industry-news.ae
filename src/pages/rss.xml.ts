/** RSS по новостям (ТЗ ч.10). */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { ROUTES } from '../lib/routes.mjs';
import { sortNews, CATEGORIES } from '../lib/news.mjs';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const GET: APIRoute = async ({ site }) => {
  const base = site?.href ?? 'http://localhost:4321/';
  const items = sortNews(await getCollection('news'));

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Marsad Cyber</title>
    <link>${base}</link>
    <description>Ransomware and regulation reporting for organisations in the United Arab Emirates. No affected organisation is ever named.</description>
    <language>en</language>
    <atom:link href="${new URL('/rss.xml', base).href}" rel="self" type="application/rss+xml" />
${items.map((n) => `    <item>
      <title>${esc(n.data.h1)}</title>
      <link>${new URL(ROUTES.article(n.id), base).href}</link>
      <guid isPermaLink="true">${new URL(ROUTES.article(n.id), base).href}</guid>
      <category>${esc(CATEGORIES[n.data.category].label)}</category>
      <pubDate>${new Date(`${n.data.published}T09:00:00Z`).toUTCString()}</pubDate>
      <description>${esc(n.data.description)}</description>
    </item>`).join('\n')}
  </channel>
</rss>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
};
