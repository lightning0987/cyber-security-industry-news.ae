/**
 * ГЛАВНЫЙ ГАРД ПРОЕКТА. Ловит имя жертвы в собранном HTML.
 *
 * Работает не грепом строк: сырых строк в репозитории нет и быть не должно.
 * Вместо этого из каждой страницы извлекаются текстовые узлы и значения
 * атрибутов, из них строятся n-граммы, n-граммы солятся тем же секретом и
 * сверяются с закоммиченным списком отпечатков. Непустое пересечение —
 * публикация заблокирована.
 *
 * ПРОВЕРКА СОЛИ ОБЯЗАТЕЛЬНА. Если соль на этой машине не та, что была при
 * расчёте отпечатков, пересечение будет пустым всегда, и гард молча пропустит
 * любую утечку. Это худший из возможных отказов: защита выглядит зелёной.
 * Поэтому salt_id сверяется до сверки отпечатков, и несовпадение — фатально.
 *
 * Фатально всегда. Без warn-режима и без allowlist-лазейки.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getSalt, hashValue, ngrams, saltId } from '../lib/fingerprint.mjs';

/**
 * Текст страницы, собранный по текстовым узлам и склеенный ПРОБЕЛАМИ.
 *
 * Использовать body.textContent здесь нельзя: он склеивает соседние элементы
 * без разделителя, и "…SMA Design" + "Marsad Cyber…" превращается в одно слово
 * "DesignMarsad". Имя жертвы, оказавшееся в конце любого элемента, при таком
 * склеивании перестаёт совпадать с отпечатком, и гард молча пропускает утечку.
 * Проверено целевым тестом: до этой правки гард не ловил реальное имя из данных.
 *
 * Побочная польза: фраза, разорванная инлайновым тегом (<strong> и подобными),
 * наоборот собирается обратно, потому что normalise схлопывает пробелы.
 */
function textNodes(root) {
  const out = [];
  const walk = (node) => {
    for (const child of node.childNodes ?? []) {
      const tag = child.tagName?.toLowerCase?.();
      if (tag === 'script' || tag === 'style') continue;
      if (child.nodeType === 3) out.push(child.textContent ?? '');
      else walk(child);
    }
  };
  walk(root);
  return out;
}

/** Внешние домены, на которые сайту разрешено ссылаться. */
const ALLOWED_EXTERNAL_HOSTS = new Set([
  'www.ransomware.live', 'ransomware.live',
  'www.cisa.gov', 'cisa.gov',
  'www.first.org', 'first.org',
  'nvd.nist.gov', 'www.nist.gov',
  'tdra.gov.ae', 'www.tdra.gov.ae',
  'csc.gov.ae', 'www.csc.gov.ae',
  'www.desc.gov.ae', 'desc.gov.ae',
  'uaelegislation.gov.ae',
  'creativecommons.org',
  'schema.org',
  // Источник фотографий. Ссылки ведут на страницу автора и на карточку снимка:
  // лицензия атрибуции не требует, но прослеживаемость источника — принцип сайта.
  'unsplash.com', 'www.unsplash.com',
]);

export const name = 'no-victim-data';

export function run({ pages }) {
  const failures = [];

  const fpPath = resolve(process.cwd(), 'src/data/ransomware-live-ae.fingerprints.json');
  if (!existsSync(fpPath)) {
    return { name, failures: ['Файл отпечатков отсутствует — гард не может работать.'] };
  }
  const fpFile = JSON.parse(readFileSync(fpPath, 'utf8'));

  // Сверка соли — до всего остального.
  let salt;
  try {
    salt = getSalt();
  } catch (error) {
    return { name, failures: [`Соль недоступна, гард не может работать: ${error.message}`] };
  }
  if (saltId(salt) !== fpFile.salt_id) {
    return {
      name,
      failures: [
        `salt_id не совпадает: отпечатки посчитаны солью ${fpFile.salt_id}, ` +
        `а здесь соль ${saltId(salt)}. Гард не нашёл бы ни одного совпадения ` +
        'и молча пропустил бы любую утечку. Нужна та же соль (секрет VICTIM_HASH_SALT).',
      ],
    };
  }

  const fingerprints = new Set(fpFile.fingerprints);

  for (const page of pages) {
    const { path, doc, html } = page;

    // 1. .onion. Полный адрес фатален где угодно. Голое слово ".onion" в прозе
    //    легитимно (редполитика объясняет, что мы такие адреса не публикуем),
    //    поэтому оно ловится только внутри значений href и src.
    const onionAddress = html.match(/\b[a-z2-7]{16,56}\.onion\b/i);
    if (onionAddress) failures.push(`${path}: адрес .onion в выдаче ("${onionAddress[0]}")`);
    for (const el of doc.querySelectorAll('[href], [src]')) {
      const v = (el.getAttribute('href') ?? el.getAttribute('src') ?? '').toLowerCase();
      if (v.includes('.onion')) failures.push(`${path}: .onion в ссылке — ${v.slice(0, 60)}`);
    }

    // 2. Отпечатки: текстовые узлы плюс значения значимых атрибутов.
    const haystack = [];
    if (doc.body) haystack.push(textNodes(doc.body).join(' '));
    for (const el of doc.querySelectorAll('[href], [src], [content], [datetime], [alt], [title]')) {
      for (const attr of ['href', 'src', 'content', 'datetime', 'alt', 'title']) {
        const v = el.getAttribute?.(attr);
        if (v) haystack.push(v);
      }
    }
    const titleEl = doc.querySelector('title');
    if (titleEl) haystack.push(titleEl.textContent ?? '');

    const hit = new Set();
    for (const chunk of haystack) {
      for (const gram of ngrams(chunk)) {
        if (fingerprints.has(hashValue(gram, salt))) hit.add(gram);
      }
    }
    for (const gram of hit) {
      failures.push(`${path}: текст совпал с отпечатком удалённого поля — "${gram.slice(0, 60)}"`);
    }

    // 3. Внешние ссылки только на разрешённые домены.
    for (const a of doc.querySelectorAll('a[href]')) {
      const href = a.getAttribute('href') ?? '';
      if (!/^https?:\/\//i.test(href)) continue;
      let host;
      try { host = new URL(href).hostname.toLowerCase(); } catch { continue; }
      if (!ALLOWED_EXTERNAL_HOSTS.has(host)) {
        failures.push(`${path}: внешняя ссылка на домен вне allowlist — ${host}`);
      }
    }
  }

  return { name, failures };
}
