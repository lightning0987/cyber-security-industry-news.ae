#!/usr/bin/env node
/**
 * Пре-билд гейты. Без сети, до запуска Astro.
 *
 * Смысл — падать как можно раньше и как можно понятнее. Всё, что можно поймать
 * на уровне данных, ловится здесь, а не на уровне собранного HTML, где причина
 * ошибки уже неочевидна.
 *
 * Запуск: npm run check:data
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

const failures = [];
const notes = [];
const fail = (msg) => failures.push(msg);

/** Ключи, которые разрешено иметь публичной записи. Всё остальное — утечка. */
const ALLOWED_RECORD_KEYS = new Set([
  'id', 'victim_hash', 'group', 'group_slug', 'group_family',
  'sector', 'sector_label', 'discovered', 'published', 'year', 'month',
  'ae_confidence',
]);

/** Поля, присутствие которых означает провал главной защиты проекта. */
const FORBIDDEN_RECORD_KEYS = new Set([
  'post_title', 'website', 'description', 'post_url', 'country', 'ransom',
  'data_size', 'activity', 'group_name', 'victim', 'domain', 'url',
]);

function checkSnapshot() {
  const path = resolve(process.cwd(), 'src/data/ransomware-live-ae.json');
  if (!existsSync(path)) {
    fail('Снапшот src/data/ransomware-live-ae.json отсутствует. Запусти npm run fetch:ransomware');
    return null;
  }

  const snap = JSON.parse(readFileSync(path, 'utf8'));

  for (const field of ['source', 'endpoint', 'fetched_at', 'record_count', 'schema_version', 'records']) {
    if (!(field in snap)) fail(`В конверте снапшота нет поля "${field}"`);
  }

  if (snap.record_count !== snap.records?.length) {
    fail(`record_count=${snap.record_count}, а записей ${snap.records?.length}`);
  }

  // Allowlist ключей — второй рубеж после снятия полей в лоадере.
  const seen = new Set();
  for (const r of snap.records ?? []) for (const k of Object.keys(r)) seen.add(k);

  const forbidden = [...seen].filter((k) => FORBIDDEN_RECORD_KEYS.has(k));
  if (forbidden.length > 0) {
    fail(`КРИТИЧНО: в записях есть запрещённые поля: ${forbidden.join(', ')}. ` +
      'Это означает, что граница снятия в scripts/fetch-ransomware-live.mjs сломана.');
  }

  const unexpected = [...seen].filter((k) => !ALLOWED_RECORD_KEYS.has(k));
  if (unexpected.length > 0) {
    fail(`Неожиданные поля в записях: ${unexpected.join(', ')}. ` +
      'Если поле добавлено намеренно — внеси его в ALLOWED_RECORD_KEYS и объясни зачем.');
  }

  // Незнакомые лейблы секторов: URL не должен появляться сам собой.
  for (const { label, count } of snap.unknown_sector_labels ?? []) {
    fail(`Незнакомый лейбл сектора "${label}" (${count} зап.). ` +
      'Добавь строку в src/lib/taxonomy/sectors.mjs — URL не создаётся автоматически.');
  }

  notes.push(`снапшот: ${snap.record_count} записей, от ${snap.fetched_at}`);
  return snap;
}

function checkFingerprints(snap) {
  const path = resolve(process.cwd(), 'src/data/ransomware-live-ae.fingerprints.json');
  if (!existsSync(path)) {
    fail('Файл отпечатков отсутствует. Без него гард утечки не работает.');
    return;
  }
  const fp = JSON.parse(readFileSync(path, 'utf8'));
  if (!fp.salt_id) fail('В файле отпечатков нет salt_id — гард не сможет проверить совпадение соли.');
  if (!Array.isArray(fp.fingerprints) || fp.fingerprints.length === 0) {
    fail('Список отпечатков пуст. Гард утечки выродился бы в no-op.');
  }
  if (snap && fp.fingerprints.length < snap.record_count) {
    fail(`Отпечатков (${fp.fingerprints.length}) меньше, чем записей (${snap.record_count}). ` +
      'Похоже, часть записей осталась без отпечатка.');
  }
  notes.push(`отпечатков: ${fp.fingerprints?.length ?? 0}, salt_id ${fp.salt_id}`);
}

function checkGroupSlugCollisions(snap) {
  const bySlug = new Map();
  for (const r of snap?.records ?? []) {
    const set = bySlug.get(r.group_slug) ?? new Set();
    set.add(r.group);
    bySlug.set(r.group_slug, set);
  }
  for (const [slug, names] of bySlug) {
    if (names.size > 1) {
      fail(`Коллизия слагов групп: "${slug}" получается из ${[...names].join(', ')}`);
    }
  }
}

function checkSectorSlugsNotYearLike() {
  // Секторы и периоды делят один динамический роут, поэтому слаг сектора
  // не имеет права выглядеть как год.
  const path = resolve(process.cwd(), 'src/lib/taxonomy/sectors.mjs');
  const src = readFileSync(path, 'utf8');
  for (const m of src.matchAll(/slug: '([^']+)'/g)) {
    if (/^\d{4}(-\d{4})?$/.test(m[1])) {
      fail(`Слаг сектора "${m[1]}" выглядит как период и столкнётся с годовыми страницами`);
    }
  }
}

function checkForbiddenTerms() {
  const path = resolve(process.cwd(), 'src/data/forbidden-terms.json');
  if (!existsSync(path)) {
    fail('src/data/forbidden-terms.json отсутствует. Пересобери: node scripts/build-forbidden-terms.mjs');
    return;
  }
  const f = JSON.parse(readFileSync(path, 'utf8'));
  if (!f.salt_id || !Array.isArray(f.hashes) || f.hashes.length === 0) {
    fail('Список запрещённых терминов пуст или без salt_id — проверка выродилась бы в no-op.');
  } else {
    notes.push(`запрещённых терминов: ${f.hashes.length}`);
  }
}

function checkGuidesRegistry() {
  // src/lib/guides.mjs дублирует слаги для синхронной навигации.
  // Расхождение с файлами дало бы битые ссылки в подвале и сайдбаре.
  const dir = resolve(process.cwd(), 'src/content/guides');
  if (!existsSync(dir)) return;
  const files = readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, ''));
  const registry = readFileSync(resolve(process.cwd(), 'src/lib/guides.mjs'), 'utf8');
  const listed = [...registry.matchAll(/slug: '([^']+)'/g)].map((m) => m[1]);

  for (const f of files) {
    if (!listed.includes(f)) fail(`Гайд ${f}.md есть в контенте, но его нет в src/lib/guides.mjs — он не попадёт в навигацию.`);
  }
  for (const l of listed) {
    if (!files.includes(l)) fail(`В src/lib/guides.mjs указан ${l}, но файла src/content/guides/${l}.md нет — ссылка будет битой.`);
  }
  notes.push(`гайдов: ${files.length}`);
}

function checkPrivateIsolation() {
  // src/ не имеет права ничего знать о private/.
  try {
    // Только файлы кода: смысл правила в том, что ничто из src/ не ЧИТАЕТ private/.
    // Упоминание пути в пояснительном тексте JSON-данных нарушением не является.
    const hits = execSync(
      'grep -rn "private/" --include="*.mjs" --include="*.ts" --include="*.astro" src/ 2>/dev/null || true',
      { encoding: 'utf8' },
    ).trim();
    if (hits) fail(`src/ ссылается на private/:\n      ${hits.split('\n').join('\n      ')}`);
  } catch { /* grep без совпадений — это успех */ }

  // И соль не должна оказаться в отслеживаемых файлах.
  try {
    const tracked = execSync(
      'git grep -lE "[a-f0-9]{64}" -- . ":(exclude)package-lock.json" 2>/dev/null || true',
      { encoding: 'utf8' },
    ).trim();
    if (tracked) notes.push(`⚠ 64-символьные hex-строки в отслеживаемых файлах: ${tracked.split('\n').join(', ')}`);
  } catch { /* репозиторий может быть без коммитов */ }
}

const snap = checkSnapshot();
if (snap) {
  checkFingerprints(snap);
  checkGroupSlugCollisions(snap);
}
checkSectorSlugsNotYearLike();
checkForbiddenTerms();
checkGuidesRegistry();
checkPrivateIsolation();

console.log('check:data');
for (const n of notes) console.log(`  · ${n}`);

if (failures.length > 0) {
  console.error(`\n✖ Пре-билд проверки не пройдены (${failures.length}):`);
  for (const f of failures) console.error(`    • ${f}`);
  process.exit(1);
}
console.log('  ✓ все пре-билд проверки пройдены');
