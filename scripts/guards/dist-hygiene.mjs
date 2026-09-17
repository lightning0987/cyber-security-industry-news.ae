/**
 * Гигиена выдачи.
 *
 * Три требования, которые легко нарушить незаметно: навигация не должна зависеть
 * от JavaScript, в выдаче не должно быть упоминаний клиента и агентства, и
 * выключенные промо-слоты не должны оставлять разметку.
 *
 * ЗАПРЕЩЁННЫЕ ТЕРМИНЫ ХРАНЯТСЯ ХЕШАМИ, а не строками. Список открытым текстом
 * прямо здесь означал бы, что гард сам вносит в публичный репозиторий то, что
 * обязан оттуда не выпускать. Плейнтекст лежит в private/forbidden-terms.txt,
 * хеши пересобираются через scripts/build-forbidden-terms.mjs.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getSalt, hashValue, ngramsAll, saltId } from '../lib/fingerprint.mjs';

export const name = 'dist-hygiene';

function textOf(root) {
  const out = [];
  const walk = (node) => {
    for (const child of node.childNodes ?? []) {
      const tag = child.tagName?.toLowerCase?.();
      if (tag === 'style') continue;
      if (child.nodeType === 3) out.push(child.textContent ?? '');
      else walk(child);
    }
  };
  walk(root);
  return out.join(' ');
}

export function run({ pages }) {
  const failures = [];

  const termsPath = resolve(process.cwd(), 'src/data/forbidden-terms.json');
  let terms = null;
  if (!existsSync(termsPath)) {
    failures.push('src/data/forbidden-terms.json отсутствует — проверка упоминаний не работает.');
  } else {
    const file = JSON.parse(readFileSync(termsPath, 'utf8'));
    try {
      const salt = getSalt();
      if (saltId(salt) !== file.salt_id) {
        failures.push(
          `salt_id запрещённых терминов не совпадает (${file.salt_id} против ${saltId(salt)}). ` +
          'Проверка молча не нашла бы ничего. Пересобери: node scripts/build-forbidden-terms.mjs',
        );
      } else {
        terms = { set: new Set(file.hashes), maxTokens: file.max_tokens, salt };
      }
    } catch (error) {
      failures.push(`Соль недоступна, проверка терминов не работает: ${error.message}`);
    }
  }

  for (const { path, doc } of pages) {
    if (terms) {
      const haystack = [textOf(doc.documentElement ?? doc), doc.querySelector('title')?.textContent ?? ''];
      for (const el of doc.querySelectorAll('[href], [src], [content]')) {
        for (const attr of ['href', 'src', 'content']) {
          const v = el.getAttribute?.(attr);
          if (v) haystack.push(v);
        }
      }
      for (const chunk of haystack) {
        for (const gram of ngramsAll(chunk, terms.maxTokens)) {
          if (terms.set.has(hashValue(gram, terms.salt))) {
            failures.push(`${path}: запрещённый термин в выдаче — "${gram.slice(0, 50)}"`);
          }
        }
      }
    }

    // Единственный допустимый скрипт — сортировка таблиц, и он не участвует
    // в навигации и не несёт данных. Всё остальное запрещено.
    for (const sc of doc.querySelectorAll('script[src]')) {
      const src = sc.getAttribute('src') ?? '';
      if (src !== '/js/table-sort.mjs') {
        failures.push(`${path}: посторонний скрипт ${src}`);
      }
    }

    // Навигация через JS: краулер таких ссылок не видит.
    for (const el of doc.querySelectorAll('[onclick]')) {
      failures.push(`${path}: обработчик onclick на <${el.tagName.toLowerCase()}> — навигация обязана быть в href`);
    }
    for (const a of doc.querySelectorAll('a')) {
      if (!a.getAttribute('href')) {
        failures.push(`${path}: тег <a> без href — краулер такую ссылку не увидит`);
      }
    }

    // Выключенный промо-слот обязан давать ноль байт.
    if ((doc.body?.innerHTML ?? '').includes('promo-slot')) {
      failures.push(`${path}: выключенный промо-слот оставил разметку в HTML`);
    }
  }

  return { name, failures: [...new Set(failures)] };
}
