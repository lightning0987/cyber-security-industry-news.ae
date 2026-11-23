#!/usr/bin/env node
/**
 * Профили групп — ВТОРАЯ ГРАНИЦА СНЯТИЯ ЗАПРЕЩЁННЫХ ПОЛЕЙ.
 *
 * Апстрим отдаёт по каждой группе описание, дату появления, псевдонимы,
 * инструменты и TTP. Там же он отдаёт `locations` и `url` — адреса сайтов
 * утечек, то есть .onion. Их здесь и только здесь снимают в памяти, до
 * первой записи в src/. Нарушить это нельзя ошибкой в шаблоне: поля просто
 * не существуют в файле, который читает Astro.
 *
 * СНИМАЮТСЯ: locations, url, и любой адрес внутри свободного текста.
 * Описание приходит от третьей стороны и может содержать что угодно,
 * поэтому из него вырезаются ссылки и .onion, а длина ограничивается.
 *
 * Описание НЕ публикуется дословно. Оно едет в бриф как факт, а абзац для
 * страницы пишет генератор в стиле сайта. Чужой текст на пятидесяти
 * страницах это дубль в выдаче и чужая редактура в нашей рубрике.
 *
 * Хранятся только группы, у которых есть заявления по ОАЭ. Профиль группы,
 * не встречающейся в нашем наборе, публиковать негде и незачем.
 *
 * Запуск: npm run fetch:groups [-- --force]
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { fetchJson } from './lib/http.mjs';
import { defendAgainstRegression, readSnapshot, writeSnapshot } from './lib/snapshot.mjs';
import { slugifyGroup } from '../src/lib/taxonomy/groups.mjs';

const SOURCE = 'ransomware.live';
const ENDPOINT = 'https://api.ransomware.live/v2/groups';
const SNAPSHOT_NAME = 'ransomware-group-profiles';
const VICTIMS_SNAPSHOT = 'src/data/ransomware-live-ae.json';

/** Любой адрес: .onion, http(s), голый домен с путём. */
const ADDRESS = /\b(?:[a-z2-7]{16,56}\.onion|https?:\/\/\S+|www\.\S+)\b/gi;

const MAX_DESCRIPTION = 1200;

/**
 * Описание от третьей стороны, пригодное для чтения человеком.
 * Адреса вырезаются, пробелы схлопываются, длина ограничивается.
 */
function sanitiseText(value) {
  const text = String(value ?? '')
    .replace(ADDRESS, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length === 0) return null;
  return text.length > MAX_DESCRIPTION ? `${text.slice(0, MAX_DESCRIPTION).trimEnd()}…` : text;
}

/** Короткий список строк: инструменты, TTP, псевдонимы. */
function sanitiseList(value) {
  const items = Array.isArray(value) ? value : value ? [value] : [];
  return [
    ...new Set(
      items
        .map((v) => sanitiseText(typeof v === 'string' ? v : (v?.name ?? v?.title ?? '')))
        .filter(Boolean)
        .map((s) => s.slice(0, 120)),
    ),
  ].slice(0, 12);
}

/**
 * Профиль, пригодный для публикации. Ключи перечислены явно: распаковка
 * исходной записи протащила бы вперёд поле, о котором мы не знаем.
 */
function normaliseProfile(raw) {
  const name = String(raw.name ?? '').trim();
  return {
    name,
    slug: slugifyGroup(name),
    description: sanitiseText(raw.description),
    added_date: typeof raw.added_date === 'string' ? raw.added_date.slice(0, 10) : null,
    aliases: sanitiseList(raw.altname),
    tools: sanitiseList(raw.tools),
    ttps: sanitiseList(raw.ttps),
  };
}

async function main() {
  const force = process.argv.includes('--force');

  const victims = JSON.parse(readFileSync(resolve(process.cwd(), VICTIMS_SNAPSHOT), 'utf8'));
  const wanted = new Set(victims.records.map((r) => r.group_slug));
  console.log(`  групп с заявлениями по ОАЭ: ${wanted.size}`);

  console.log(`→ ${ENDPOINT}`);
  const { data, attempts } = await fetchJson(ENDPOINT);
  if (!Array.isArray(data)) {
    throw new Error(`Ожидался JSON-массив, получен ${typeof data}. Апстрим сменил форму ответа.`);
  }
  console.log(`  получено ${data.length} профилей за ${attempts} попыт(ок)`);

  const records = [];
  const seen = new Set();
  for (const raw of data) {
    const profile = normaliseProfile(raw);
    if (!profile.slug || !wanted.has(profile.slug) || seen.has(profile.slug)) continue;
    seen.add(profile.slug);
    records.push(profile);
  }
  records.sort((a, b) => a.slug.localeCompare(b.slug));

  const missing = [...wanted].filter((s) => !seen.has(s));
  console.log(`  профилей сопоставлено: ${records.length}, без профиля: ${missing.length}`);
  if (missing.length > 0) {
    // Не ошибка: страница группы строится и без профиля, просто без врезки
    // «кто это». Но знать об этом нужно, иначе молчаливый пробел растёт.
    console.log(`    без профиля: ${missing.slice(0, 12).join(', ')}${missing.length > 12 ? '…' : ''}`);
  }

  const previous = readSnapshot(SNAPSHOT_NAME);
  const problems = defendAgainstRegression(records, previous, {});
  if (problems.length > 0 && !force) {
    console.error('\n✖ Снапшот НЕ записан — свежие данные выглядят повреждёнными:');
    for (const p of problems) console.error(`    • ${p}`);
    console.error('\n  Предыдущий снапшот оставлен нетронутым. --force если апстрим правда изменился.\n');
    process.exit(1);
  }

  const envelope = writeSnapshot(SNAPSHOT_NAME, {
    source: SOURCE,
    endpoint: ENDPOINT,
    records,
    extra: { groups_without_profile: missing.sort() },
  });

  console.log(`\n✓ ${SNAPSHOT_NAME}: ${envelope.record_count} профилей, ${envelope.fetched_at}`);
}

main().catch((err) => {
  console.error(`\n✖ ${err.message}`);
  process.exit(1);
});
