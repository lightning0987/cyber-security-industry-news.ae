/**
 * Чтение и запись снапшотов данных.
 *
 * Снапшот — единственный источник фактов для сайта. Критерий приёмки проекта:
 * ни одного числа на сайте, которого нет в снапшоте. Поэтому сборка полностью
 * офлайн, а снапшот коммитится в git: флапающий апстрим не может уронить деплой,
 * а история коммитов заменяет базу данных для графиков динамики.
 *
 * ГЛАВНОЕ ЗДЕСЬ — defendAgainstRegression(). Частичный ответ апстрима на 20
 * записей вместо 182 тихо снёс бы две трети страниц секторов и групп. Ссылки на
 * них побились бы, а гард перелинковки этого не заметил бы: он видит только то,
 * что собралось. Это опаснее, чем неудачная загрузка, потому что выглядит
 * успехом. Поэтому лоадер скорее откажется писать, чем запишет подозрительное.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SCHEMA_VERSION = 1;

/** Насколько может просесть число записей, прежде чем это считается поломкой. */
const MAX_SHRINK_RATIO = 0.1;

export function snapshotPath(name) {
  return resolve(process.cwd(), 'src/data', `${name}.json`);
}

export function readSnapshot(name) {
  const path = snapshotPath(name);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(`Снапшот ${name} повреждён и не парсится: ${error.message}`);
  }
}

/**
 * Сверяет свежие записи с предыдущим снапшотом и возвращает список претензий.
 * Пустой список — писать можно.
 *
 * @param {object[]} nextRecords
 * @param {object|null} previous
 * @param {{facets?: Record<string, (r: object) => string|null>}} options
 *        facets — измерения, исчезновение значения в которых считается поломкой
 *        (например, сектор или группа, бывшие в прошлом снапшоте).
 */
export function defendAgainstRegression(nextRecords, previous, options = {}) {
  const problems = [];
  if (!previous) return problems;

  const prevCount = previous.records?.length ?? 0;
  const nextCount = nextRecords.length;

  if (prevCount > 0) {
    const shrink = (prevCount - nextCount) / prevCount;
    if (shrink > MAX_SHRINK_RATIO) {
      problems.push(
        `число записей упало с ${prevCount} до ${nextCount} ` +
          `(−${Math.round(shrink * 100)}%, допустимо −${MAX_SHRINK_RATIO * 100}%)`,
      );
    }
  }

  for (const [facetName, pick] of Object.entries(options.facets ?? {})) {
    const before = new Set((previous.records ?? []).map(pick).filter(Boolean));
    const after = new Set(nextRecords.map(pick).filter(Boolean));
    const vanished = [...before].filter((v) => !after.has(v));
    if (vanished.length > 0) {
      problems.push(
        `из измерения "${facetName}" полностью исчезло ${vanished.length} значений: ` +
          `${vanished.slice(0, 6).join(', ')}${vanished.length > 6 ? ' …' : ''}`,
      );
    }
  }

  return problems;
}

/**
 * Пишет снапшот в конверте фиксированной формы.
 * `fetched_at` рендерится на каждой странице с данными как «Data as of».
 */
export function writeSnapshot(name, { source, endpoint, records, extra = {} }) {
  const envelope = {
    source,
    endpoint,
    fetched_at: new Date().toISOString(),
    record_count: records.length,
    schema_version: SCHEMA_VERSION,
    ...extra,
    records,
  };
  writeFileSync(snapshotPath(name), `${JSON.stringify(envelope, null, 2)}\n`, 'utf8');
  return envelope;
}

export { SCHEMA_VERSION, MAX_SHRINK_RATIO };
