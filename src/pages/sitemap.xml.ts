/**
 * XML-карта сайта с lastmod (ТЗ ч.10).
 *
 * Строится из тех же источников, что и страницы, поэтому не может разойтись
 * с реальным составом сайта. lastmod берётся из даты снапшота для страниц
 * данных и из даты материала для контента: это честная дата изменения, а не
 * дата сборки.
 */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { attributedIncidents, snapshotMeta } from '../lib/incidents.mjs';
import { bySector, byPeriod, groupsWithPages } from '../lib/aggregate.mjs';
import { ROUTES } from '../lib/routes.mjs';
import { NEWS_CATEGORIES } from '../lib/news-registry.mjs';

export const GET: APIRoute = async ({ site }) => {
  const base = site?.href ?? 'http://localhost:4321/';
  const dataDate = snapshotMeta.fetchedAt.slice(0, 10);
  const inc = attributedIncidents;

  const urls: Array<{ loc: string; lastmod: string; priority: string }> = [];
  const add = (path: string, lastmod: string, priority: string) =>
    urls.push({ loc: new URL(path, base).href, lastmod, priority });

  add(ROUTES.home(), dataDate, '1.0');
  add(ROUTES.tracker(), dataDate, '0.9');
  add(ROUTES.groupsHub(), dataDate, '0.9');
  for (const s of bySector(inc)) add(ROUTES.sector(s.slug), dataDate, '0.8');
  for (const p of byPeriod(inc)) add(ROUTES.period(p.slug), dataDate, '0.7');
  for (const g of groupsWithPages(inc)) add(ROUTES.group(g.slug), dataDate, '0.7');

  for (const g of await getCollection('guides')) add(ROUTES.guide(g.id), g.data.updated, '0.8');
  add(ROUTES.guides(), dataDate, '0.7');

  const news = await getCollection('news');
  for (const n of news) add(`/${n.id}/`, n.data.published, '0.7');
  add(ROUTES.news(), dataDate, '0.7');
  for (const c of NEWS_CATEGORIES) add(ROUTES.category(c.slug), dataDate, '0.6');
  for (const key of new Set(news.map((n) => n.data.published.slice(0, 7)))) {
    const [y, m] = key.split('-');
    add(`/news/${y}/${m}/`, dataDate, '0.4');
  }

  for (const p of ['/about/', '/methodology/', '/data-sources/', '/editorial-policy/', '/credits/', '/sitemap/', '/contact/']) {
    add(p, dataDate, '0.5');
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
