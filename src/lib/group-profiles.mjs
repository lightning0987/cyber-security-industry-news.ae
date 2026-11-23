/**
 * Профили групп: единственный модуль, из которого src/ берёт справочные
 * сведения о группе (чем она является, когда появилась, псевдонимы).
 *
 * СТРОГИЙ ZOD — вторая линия после границы снятия в
 * scripts/fetch-group-profiles.mjs. `.strict()` роняет сборку на любом
 * неожиданном ключе, то есть правка лоадера не сможет тихо вернуть в данные
 * `locations` или `url`, то есть адреса сайтов утечек.
 *
 * Отдельная проверка на адрес внутри свободного текста стоит здесь, а не
 * только в загрузчике: загрузчик запускается руками и в ночном прогоне, а
 * этот модуль читается на каждой сборке. Чтобы .onion попал на страницу,
 * пришлось бы обойти оба.
 */

import { z } from 'astro/zod';
import snapshot from '../data/ransomware-group-profiles.json' with { type: 'json' };

const ADDRESS = /[a-z2-7]{16,56}\.onion|https?:\/\/|www\./i;

const text = (max) =>
  z
    .string()
    .max(max)
    .refine((v) => !ADDRESS.test(v), { message: 'адрес сайта утечки в тексте профиля' });

const ProfileSchema = z
  .object({
    name: z.string().min(1),
    slug: z.string().min(1),
    description: text(1300).nullable(),
    added_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    aliases: z.array(text(120)).max(12),
    tools: z.array(text(120)).max(12),
    ttps: z.array(text(120)).max(12),
  })
  .strict();

const SnapshotSchema = z
  .object({
    source: z.string(),
    endpoint: z.string().url(),
    fetched_at: z.string(),
    record_count: z.number().int(),
    schema_version: z.number().int(),
    groups_without_profile: z.array(z.string()),
    records: z.array(ProfileSchema),
  })
  .strict();

const parsed = SnapshotSchema.parse(snapshot);

const bySlug = new Map(parsed.records.map((p) => [p.slug, p]));

/** Профиль группы или null. Страница строится и без него. */
export function groupProfile(slug) {
  return bySlug.get(slug) ?? null;
}

export const profilesFetchedAt = parsed.fetched_at;
export const profileCount = parsed.record_count;
