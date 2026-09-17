/**
 * Открытый фид датасета (ТЗ ч.10).
 *
 * Публикуем именно данные об инцидентах, а не служебную карту сущностей:
 * карта — внутренний артефакт для генерации контента, наружу ей незачем.
 *
 * Поля те же, что в снапшоте: ничего идентифицирующего жертву здесь нет и быть
 * не может — эти поля не существуют уже на входе в src/.
 */
import type { APIRoute } from 'astro';
import { allIncidents, attributedIncidents, snapshotMeta } from '../../lib/incidents.mjs';

export const GET: APIRoute = ({ site }) => {
  const body = {
    name: 'UAE ransomware leak-site claims',
    description:
      'Aggregate ransomware leak-site claims against organisations in the United Arab Emirates. No affected organisation is identified: only sector, group and date are published.',
    source: snapshotMeta.source,
    endpoint: snapshotMeta.endpoint,
    data_as_of: snapshotMeta.fetchedAt,
    licence: 'https://creativecommons.org/licenses/by/4.0/',
    attribution_note:
      'Upstream country tagging is unreliable. `attributed` counts records with a verifiable UAE link and is the basis of every headline figure on the site.',
    counts: {
      raw_records: allIncidents.length,
      attributed: attributedIncidents.length,
      by_confidence: snapshotMeta.attribution,
    },
    methodology: new URL('/methodology/', site ?? 'http://localhost:4321').href,
    records: attributedIncidents,
  };
  return new Response(JSON.stringify(body, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
