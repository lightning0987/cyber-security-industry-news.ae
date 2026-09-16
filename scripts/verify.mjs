#!/usr/bin/env node
/**
 * Пост-билд гарды.
 *
 * Запускается внутри npm run build, то есть внутри той команды, которую
 * выполняет хостинг. Cloudflare Pages публикует dist/ тогда и только тогда,
 * когда команда сборки вернула ноль. Если бы гарды жили в отдельной джобе или в
 * скрипте, который человек запускает руками, утечка доехала бы до прода в первый
 * же раз, когда шаг пропустили. Голый вызов Astro называется build:astro именно
 * поэтому: чтобы к нему не тянулись по привычке.
 *
 * Гарды не замыкаются на первой ошибке — нужен полный список проблем.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { parseHTML } from 'linkedom';

import * as noVictimData from './guards/no-victim-data.mjs';
import * as uniqueMeta from './guards/unique-meta.mjs';
import * as linkGraph from './guards/link-graph.mjs';
import * as distHygiene from './guards/dist-hygiene.mjs';

const DIST = resolve(process.cwd(), 'dist');
const GUARDS = [noVictimData, uniqueMeta, linkGraph, distHygiene];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith('.html')) out.push(full);
  }
  return out;
}

let files;
try {
  files = walk(DIST);
} catch {
  console.error('✖ dist/ не найден. Сначала npm run build:astro');
  process.exit(1);
}

// HTML парсится один раз и передаётся всем гардам.
const pages = files.map((file) => {
  const html = readFileSync(file, 'utf8');
  const { document } = parseHTML(html);
  return { path: relative(DIST, file), doc: document, html };
});

console.log(`verify: ${pages.length} страниц в dist/`);

let total = 0;
for (const guard of GUARDS) {
  const { name, failures, stats } = guard.run({ pages });
  total += failures.length;

  if (failures.length === 0) {
    console.log(`  ✓ ${name}`);
  } else {
    console.log(`  ✖ ${name} — ${failures.length} проблем(ы)`);
    for (const f of failures.slice(0, 25)) console.log(`      • ${f}`);
    if (failures.length > 25) console.log(`      … и ещё ${failures.length - 25}`);
  }
  if (stats) {
    console.log(`      max depth ${stats.maxDepth}, слабейшие по входящим: ${stats.weakest.join(', ')}`);
  }
}

if (total > 0) {
  console.error(`\n✖ Сборка заблокирована: ${total} нарушени(й). Публикация не состоится.`);
  process.exit(1);
}
console.log('\n✓ Все пост-билд гарды пройдены. Сборку можно публиковать.');
