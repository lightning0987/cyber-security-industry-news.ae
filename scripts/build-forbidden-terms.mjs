#!/usr/bin/env node
/**
 * Превращает private/forbidden-terms.txt в src/data/forbidden-terms.json.
 *
 * ЗАЧЕМ. Гард обязан ловить упоминания клиента и агентства в собранном HTML.
 * Но если хранить эти строки в гарде открытым текстом, они окажутся в публичном
 * репозитории — то есть гард своими руками сделает ровно то, что предотвращает.
 * Поэтому в репозиторий едут только солёные хеши, а плейнтекст лежит в private/.
 *
 * Запуск: node scripts/build-forbidden-terms.mjs
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getSalt, hashValue, normalise, saltId } from './lib/fingerprint.mjs';

const src = resolve(process.cwd(), 'private/forbidden-terms.txt');
if (!existsSync(src)) {
  console.error('✖ private/forbidden-terms.txt отсутствует. Без него список не пересобрать.');
  process.exit(1);
}

const salt = getSalt();
const terms = readFileSync(src, 'utf8').split('\n').map((t) => t.trim()).filter(Boolean);
const maxTokens = Math.max(...terms.map((t) => normalise(t).split(' ').length));

writeFileSync(
  resolve(process.cwd(), 'src/data/forbidden-terms.json'),
  `${JSON.stringify({
    note: 'Солёные хеши запрещённых терминов. Плейнтекст живёт в private/forbidden-terms.txt и в репозиторий не попадает.',
    salt_id: saltId(salt),
    max_tokens: maxTokens,
    count: terms.length,
    hashes: terms.map((t) => hashValue(t, salt)).sort(),
  }, null, 2)}\n`,
  'utf8',
);
console.log(`✓ ${terms.length} терминов захешировано, максимум ${maxTokens} слов`);
