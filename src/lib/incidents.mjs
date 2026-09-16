/**
 * Единственный модуль, из которого остальной src/ берёт записи инцидентов.
 *
 * ПОЧЕМУ НЕ CONTENT COLLECTIONS. Content Layer сохраняет данные каждой записи в
 * .astro/data-store.json и кеширует между сборками. Для проекта, где ключевое
 * требование — «ни одного числа, которого нет в снапшоте», это лишняя копия
 * данных вне модели «снапшот-файл единственный источник», способная пережить
 * ужесточение схемы. Здесь 182 записи, один JSON-массив и ноль прозы: путь
 * «файл → импорт → разбор Zod → шаблоны» короче и проверяется глазами.
 *
 * СТРОГИЙ ZOD — третий гейт защиты от утечки имени жертвы. `.strict()` роняет
 * сборку на любом неожиданном ключе, то есть будущая правка лоадера не сможет
 * тихо вернуть в данные post_title или website.
 */

import { z } from 'astro/zod';
import snapshot from '../data/ransomware-live-ae.json' with { type: 'json' };

const IncidentSchema = z
  .object({
    id: z.string().min(8),
    victim_hash: z.string().min(8),
    group: z.string().min(1),
    group_slug: z.string().min(1),
    group_family: z.string().nullable(),
    sector: z.string().nullable(),
    sector_label: z.string().nullable(),
    discovered: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    published: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    year: z.number().int().nullable(),
    month: z.string().regex(/^\d{4}-\d{2}$/).nullable(),
    ae_confidence: z.enum(['confirmed', 'probable', 'unverified']),
  })
  .strict();

const SnapshotSchema = z
  .object({
    source: z.string(),
    endpoint: z.string().url(),
    fetched_at: z.string(),
    record_count: z.number().int(),
    schema_version: z.number().int(),
    attribution: z.record(z.number()).optional(),
    unknown_sector_labels: z
      .array(z.object({ label: z.string(), count: z.number().int() }).strict())
      .optional(),
    records: z.array(IncidentSchema),
  })
  .strict();

const parsed = SnapshotSchema.parse(snapshot);

if (parsed.record_count !== parsed.records.length) {
  throw new Error(
    `Снапшот противоречив: record_count=${parsed.record_count}, ` +
      `а записей ${parsed.records.length}.`,
  );
}

/** Все записи, как они пришли из источника. */
export const allIncidents = parsed.records;

/**
 * Записи, попадающие в головные числа сайта.
 *
 * Страновая атрибуция источника ненадёжна, поэтому в заголовки, Title и schema
 * идут только confirmed и probable. unverified показываются отдельной строкой
 * и в разбивках участвуют, но общий счёт не формируют. Метод раскрыт на
 * /methodology/ — это требование раздела 0.3 и одновременно вопрос чести.
 */
export const attributedIncidents = allIncidents.filter(
  (i) => i.ae_confidence === 'confirmed' || i.ae_confidence === 'probable',
);

export const unverifiedIncidents = allIncidents.filter((i) => i.ae_confidence === 'unverified');

/** Записи, которые апстрим не классифицировал по сектору. Страниц не получают. */
export const unclassifiedIncidents = attributedIncidents.filter((i) => i.sector === null);

export const snapshotMeta = {
  source: parsed.source,
  endpoint: parsed.endpoint,
  fetchedAt: parsed.fetched_at,
  recordCount: parsed.record_count,
  schemaVersion: parsed.schema_version,
  attribution: parsed.attribution ?? {},
  unknownSectorLabels: parsed.unknown_sector_labels ?? [],
};
