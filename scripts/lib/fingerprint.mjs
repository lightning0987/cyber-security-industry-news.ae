/**
 * Солёное хеширование имён жертв.
 *
 * ЗАЧЕМ. Имя компании-жертвы публиковать нельзя (UAE Federal Decree-Law No. 34
 * of 2021, ст. 6). Но нужно уметь две вещи: дедуплицировать записи между
 * снапшотами и автоматически ловить утечку имени в собранный HTML. Обе задачи
 * решаются отпечатком — необратимой строкой вместо имени.
 *
 * ЗАЧЕМ СОЛЬ. Голый sha256("Ibn Sina Trust") обратим перебором: список компаний
 * ОАЭ конечен и скачиваем, посчитать хеш каждого названия — минуты на ноутбуке.
 * Публикация несолёных хешей была бы публикацией имён с лишним шагом.
 * Соль ломает перебор: без секрета кандидата не проверить.
 *
 * ЗАЧЕМ salt_id. Отпечатки считаются на машине, которая тянет данные, а
 * сверяются на машине, которая собирает сайт. Если соли разойдутся, пересечение
 * хешей всегда будет пустым — и гард молча пройдёт, не поймав ни одной утечки.
 * Это худший из возможных отказов: защита выглядит зелёной, но не работает.
 * Поэтому в файл отпечатков пишется salt_id — хеш самой соли, — и гард
 * обязан проверить, что его соль даёт тот же salt_id, иначе падает.
 */

import { createHash, randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SALT_FILE = resolve(process.cwd(), 'private/salt.txt');
const HASH_LENGTH = 16;

/** Минимальная длина строки, которая вообще годится в отпечаток. */
const MIN_FINGERPRINT_CHARS = 8;
const MIN_FINGERPRINT_TOKENS = 2;

let cachedSalt = null;

/**
 * Достаёт соль: сначала переменная окружения (CI), потом private/salt.txt (локально).
 * Падает, если соли нет нигде и явно не разрешено её создать.
 *
 * Молчаливая подстановка пустой строки здесь означала бы публикацию несолёных
 * хешей, поэтому такого пути нет.
 */
export function getSalt({ createIfMissing = false } = {}) {
  if (cachedSalt) return cachedSalt;

  const fromEnv = process.env.VICTIM_HASH_SALT?.trim();
  if (fromEnv) {
    cachedSalt = fromEnv;
    return cachedSalt;
  }

  if (existsSync(SALT_FILE)) {
    const fromFile = readFileSync(SALT_FILE, 'utf8').trim();
    if (fromFile) {
      cachedSalt = fromFile;
      return cachedSalt;
    }
  }

  if (createIfMissing) {
    const generated = randomBytes(32).toString('hex');
    writeFileSync(SALT_FILE, `${generated}\n`, { mode: 0o600 });
    cachedSalt = generated;
    console.warn(
      [
        '',
        '  ┌─ СОЗДАНА НОВАЯ СОЛЬ ──────────────────────────────────────────┐',
        '  │ private/salt.txt не существовал, сгенерирован новый секрет.   │',
        '  │                                                               │',
        '  │ Эта соль должна быть ОДИНАКОВОЙ везде, где считаются или      │',
        '  │ проверяются отпечатки. Положи это же значение в секрет        │',
        '  │ VICTIM_HASH_SALT репозитория GitHub, иначе гард утечки в CI   │',
        '  │ не найдёт ни одного совпадения и молча пропустит всё.         │',
        '  │                                                               │',
        '  │ Файл в .gitignore. Потеря соли = пересчёт всех отпечатков.    │',
        '  └───────────────────────────────────────────────────────────────┘',
        '',
      ].join('\n'),
    );
    return cachedSalt;
  }

  throw new Error(
    'Соль не найдена. Нужен либо секрет VICTIM_HASH_SALT, либо файл private/salt.txt.\n' +
      'Без соли отпечатки обратимы перебором — работа остановлена намеренно.',
  );
}

/** Публичный идентификатор соли. Не раскрывает её, но позволяет сверить совпадение. */
export function saltId(salt = getSalt()) {
  return createHash('sha256').update(`marsad-salt-id:${salt}`).digest('hex').slice(0, 16);
}

/** Приводит строку к канону перед хешированием: регистр, пробелы, пунктуация. */
export function normalise(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Солёный усечённый sha256 от канонизированной строки. */
export function hashValue(value, salt = getSalt()) {
  return createHash('sha256')
    .update(`${salt}:${normalise(value)}`)
    .digest('hex')
    .slice(0, HASH_LENGTH);
}

/** Годится ли строка в отпечаток. Короткие и однословные дают ложные срабатывания. */
export function isFingerprintable(value) {
  const n = normalise(value);
  return n.length >= MIN_FINGERPRINT_CHARS && n.split(' ').length >= MIN_FINGERPRINT_TOKENS;
}

/** Хост из URL или домено-подобной строки, без www. */
function hostOf(value) {
  if (!value) return null;
  const raw = String(value).trim().replace(/^https?:\/\//i, '').split('/')[0];
  const host = raw.replace(/^www\./i, '').toLowerCase();
  return host.includes('.') ? host : null;
}

/** Регистрируемый домен: последние две метки (грубо, но для сверки достаточно). */
function registrableOf(host) {
  if (!host) return null;
  const parts = host.split('.');
  return parts.length > 2 ? parts.slice(-2).join('.') : host;
}

/**
 * Все строки, по которым жертву можно опознать в одной сырой записи.
 * Отсюда берутся и отпечатки, и то, что обязано быть выброшено из снапшота.
 */
export function identifyingStrings(rawRecord) {
  const out = new Set();
  const add = (v) => {
    if (v && isFingerprintable(v)) out.add(String(v));
  };

  const { post_title, website, description, post_url } = rawRecord;

  add(post_title);
  add(website);
  add(description);

  // Описание целиком может не совпасть при переносе, поэтому и префикс.
  if (description && description.length > 80) add(description.slice(0, 80));

  for (const source of [website, post_title, post_url]) {
    const host = hostOf(source);
    if (host) {
      add(host);
      add(registrableOf(host));
    }
  }

  // Слаг от заголовка: ловит утечку через URL.
  if (post_title) add(normalise(post_title).replace(/ /g, '-'));

  return [...out];
}

/** Отпечатки одной сырой записи. */
export function fingerprintRecord(rawRecord, salt = getSalt()) {
  return identifyingStrings(rawRecord).map((s) => hashValue(s, salt));
}

/**
 * Все n-граммы длиной 1..maxN слов из куска текста, пригодные в отпечаток.
 * Используется гардом для проверки собранного HTML.
 */
export function ngrams(text, maxN = 12) {
  const words = normalise(text).split(' ').filter(Boolean);
  const out = new Set();
  for (let n = 1; n <= maxN; n += 1) {
    for (let i = 0; i + n <= words.length; i += 1) {
      const gram = words.slice(i, i + n).join(' ');
      if (isFingerprintable(gram)) out.add(gram);
    }
  }
  return out;
}

/**
 * Все n-граммы без фильтра длины. Нужны для коротких запрещённых терминов
 * ("mssp", "фсб"), которые не проходят порог isFingerprintable.
 */
export function ngramsAll(text, maxN = 4) {
  const words = normalise(text).split(' ').filter(Boolean);
  const out = new Set();
  for (let n = 1; n <= maxN; n += 1) {
    for (let i = 0; i + n <= words.length; i += 1) out.add(words.slice(i, i + n).join(' '));
  }
  return out;
}

export const HASH_META = { HASH_LENGTH, MIN_FINGERPRINT_CHARS, MIN_FINGERPRINT_TOKENS };
