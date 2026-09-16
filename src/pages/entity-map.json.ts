/**
 * Открытый фид сущностей.
 *
 * Ручная часть (эмираты, фризоны, регуляторы, рамки) мержится с программной
 * (секторы, группы, периоды), выведенной из снапшота на сборке. Именно поэтому
 * это эндпоинт, а не статический файл в public/: статику пришлось бы руками
 * синхронизировать с данными, и она разъехалась бы в первую же неделю.
 */
import type { APIRoute } from 'astro';
import entityMap from '../data/entity-map.json' with { type: 'json' };
import { attributedIncidents, snapshotMeta } from '../lib/incidents.mjs';
import { bySector, groupsWithPages } from '../lib/aggregate.mjs';
import { ROUTES, PERIODS } from '../lib/routes.mjs';

export const GET: APIRoute = ({ site }) => {
  const base = site?.href ?? 'http://localhost:4321/';
  const abs = (path: string) => new URL(path, base).href;
  const inc = attributedIncidents;

  const { note, ...curated } = entityMap as Record<string, unknown>;

  const body = {
    name: 'Marsad Cyber entity map',
    description:
      'UAE entities, regulators and frameworks referenced by this site, plus the sectors, ransomware groups and periods derived from the current data snapshot.',
    generated_at: new Date().toISOString(),
    data_as_of: snapshotMeta.fetchedAt,
    ...curated,
    sectors: bySector(inc).map((s) => ({
      name: s.label, slug: s.slug, incidents: s.count, url: abs(ROUTES.sector(s.slug)),
    })),
    ransomware_groups: groupsWithPages(inc).map((g) => ({
      name: g.label, slug: g.slug, incidents: g.count, url: abs(ROUTES.group(g.slug)),
    })),
    periods: PERIODS.map((p) => ({
      name: p.label, slug: p.slug, url: abs(ROUTES.period(p.slug)),
    })),
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
