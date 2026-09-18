#!/usr/bin/env node
/**
 * Детерминированные проверки редакционного текста.
 *
 * Правила из раздела 7.1 ТЗ плюс сверка чисел из 7.2. Проверяет кодом то, что
 * можно проверить кодом: человек при вычитке сорока файлов тире не заметит.
 *
 * САМАЯ ВАЖНАЯ ПРОВЕРКА — сверка чисел с брифом. Это замена внешнего фактчека:
 * факты приходят из API с известной схемой, поэтому правильная проверка здесь
 * не веб-поиск, а сверка каждого числа в тексте с полем исходной записи.
 *
 * Запуск: npm run lint:content
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const BRIEFS = resolve(process.cwd(), 'briefs');

/**
 * Дата снапшота, из которого собраны брифы.
 *
 * Брифы КОММИТЯТСЯ, и это не украшение репозитория. Пока они лежали в
 * гитигноре, сверка чисел работала только на машине автора: в CI брифов
 * не было, проверка вырождалась в необязательное предупреждение, и
 * расхождение текста с данными уехало бы в прод молча. Защита выглядела
 * бы зелёной — ровно тот отказ, против которого построен весь проект.
 *
 * Отсюда второе требование: бриф обязан быть собран из ТЕКУЩЕГО снапшота.
 * Устаревший бриф подтвердил бы устаревшее число с той же уверенностью.
 */
const SNAPSHOT = JSON.parse(
  readFileSync(resolve(process.cwd(), 'src/data/ransomware-live-ae.json'), 'utf8'),
);
const SNAPSHOT_AS_OF = SNAPSHOT.fetched_at ?? SNAPSHOT.meta?.fetched_at ?? null;

/**
 * Что и по каким правилам проверяем.
 *
 * Объёмы разные: T1 по разделу 6.2 ТЗ 250–400 слов, T2 по 6.3 — 600–900,
 * T3 по части 2 — от 1200. Стилевые правила общие для всех.
 *
 * Сверка чисел устроена по-разному. У страниц данных есть бриф, и число
 * сверяется с ним один к одному. У новостей и гайдов брифа нет, поэтому
 * допустимым считается любое число, встречающееся хоть в одном брифе или в
 * карте сущностей: это весь набор фактов, которым сайт вообще располагает.
 */
const SETS = [
  { dir: 'src/content/pages', words: [250, 400], h2: 3, briefPerFile: true, maxSentence: 20, claimWording: true },
  { dir: 'src/content/news', words: null, h2: null, briefPerFile: false, maxSentence: 22, claimWording: true },
  // Гайды описывают регуляторные тексты. Юридические формулировки длиннее, а
  // «personal data breach» — это термин закона, а не заявление вымогателя,
  // поэтому проверка формулировки заявлений сюда не применяется.
  // Нижняя граница 1200 — из части 2 ТЗ. Я поставил здесь 1000, и все четыре
  // гайда встали на 1043–1076, то есть ниже требования, а линтер молчал.
  // Ослабленный порог не просто пропускает нарушение, он его прячет.
  { dir: 'src/content/guides', words: [1200, 2500], h2: null, briefPerFile: false, maxSentence: 26, claimWording: false },
];

const CRITICAL = 'Critical';
const MAJOR = 'Major';

const FORBIDDEN_OPENINGS = [
  'this means', 'this approach', 'it offers', 'it provides', 'these features',
  'as mentioned above', 'additionally', 'furthermore', 'moreover',
  "in today's", 'in the modern world',
];

const VAGUE = ['many', 'several', 'significantly', 'recently', 'currently', 'various', 'numerous'];

const FILLER = [
  'comprehensive approach', 'holistic', 'synergy', 'cutting-edge', 'industry-leading',
  'we guarantee', 'in an increasingly', 'leverage', 'robust',
];

const CLAIM_SAFE = /\b(breached|hacked|was compromised|suffered a breach)\b/i;

/** Все числа, встречающиеся где угодно в брифе. */
function numbersInBrief(brief) {
  const out = new Set();
  for (const m of JSON.stringify(brief).matchAll(/\d+(?:\.\d+)?/g)) {
    out.add(m[0].replace(/^0+(?=\d)/, ''));
  }
  return out;
}

const problems = [];
const add = (file, severity, message) => problems.push({ file, severity, message });

/** Все числа из всех брифов и карты сущностей: общий запас фактов сайта. */
function globalNumbers() {
  const out = new Set();
  const collect = (text) => {
    for (const m of text.matchAll(/\d+(?:\.\d+)?/g)) out.add(m[0].replace(/^0+(?=\d)/, ''));
  };
  if (existsSync(BRIEFS)) {
    for (const f of readdirSync(BRIEFS).filter((x) => x.endsWith('.json'))) {
      collect(readFileSync(resolve(BRIEFS, f), 'utf8'));
    }
  }
  const em = resolve(process.cwd(), 'src/data/entity-map.json');
  if (existsSync(em)) collect(readFileSync(em, 'utf8'));
  return out;
}

const GLOBAL_NUMBERS = globalNumbers();

const targets = [];
for (const set of SETS) {
  const dir = resolve(process.cwd(), set.dir);
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.md'))) targets.push({ ...set, file: f, dir });
}

if (targets.length === 0) {
  console.log('lint:content — материалов пока нет');
  process.exit(0);
}

for (const target of targets) {
  const { file, dir, briefPerFile } = target;
  const raw = readFileSync(resolve(dir, file), 'utf8');
  const fm = raw.match(/^---\n([\s\S]*?)\n---\n/);
  const body = fm ? raw.slice(fm[0].length) : raw;
  // Синтаксис markdown не должен попадать в подсчёт слов и предложений:
  // [текст](/ссылка) это одно слово для читателя и три для наивного split.
  const prose = body
    .replace(/^#{1,6} .*$/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^\s*[-*]\s/gm, '')
    .replace(/^\s*\d+\.\s/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1');

  // ── Символы тире ──
  if (/[—–]/.test(raw)) add(file, CRITICAL, 'Длинное или короткое тире. Точка и новое предложение, скобки или двоеточие.');

  // ── Маркеры незаполненных данных ──
  if (/\[VERIFY\]/.test(raw)) add(file, CRITICAL, 'Маркер [VERIFY] — публикация заблокирована до проверки факта.');

  // ── Заголовки ──
  if (/^# /m.test(body)) add(file, CRITICAL, 'H1 в теле: он уже есть на странице.');
  const h2 = (body.match(/^## /gm) ?? []).length;
  if (target.h2 !== null && h2 !== target.h2) add(file, MAJOR, `Секций H2: ${h2}, ожидается ${target.h2}.`);
  if (target.h2 === null && h2 < 3) add(file, MAJOR, `Секций H2: ${h2}, нужно минимум 3.`);

  // ── Объём ──
  const tier = (fm?.[1] ?? '').match(/^tier: "(T\d)"/m)?.[1] ?? null;
  const range = target.words ?? (tier === 'T1' ? [250, 400] : [600, 950]);
  const words = prose.split(/\s+/).filter(Boolean).length;
  if (words < range[0] || words > range[1]) {
    add(file, MAJOR, `Слов: ${words}, требуется ${range[0]}–${range[1]}${tier ? ` (${tier})` : ''}.`);
  }

  // ── Абзацы ──
  const bodyBeforeSources = body.split(/^## Sources\s*$/m)[0];
  for (const para of bodyBeforeSources.split(/\n\s*\n/)) {
    const p = para.trim();
    if (!p || p.startsWith('#') || /^\d+\./.test(p) || p.startsWith('-') || p.startsWith('---')) continue;
    // Таблица — содержание, но не проза: в подсчёт слов она входит, в проверку
    // длины предложения нет. Иначе «| Sector | Claims |» читается как абзац на
    // 46 слов, и за этими ложными срабатываниями настоящие уже не видно.
    if (p.startsWith('|')) continue;

    const opening = p.toLowerCase();
    for (const bad of FORBIDDEN_OPENINGS) {
      if (opening.startsWith(bad)) add(file, CRITICAL, `Запрещённое начало абзаца: "${bad}".`);
    }

    const clean = p
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/^\s*[-*]\s/gm, '')
      .replace(/^>\s?/gm, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1');
    const sentences = clean.split(/(?<=[.!?])\s+/).filter(Boolean);
    if (sentences.length > 4) add(file, MAJOR, `Абзац из ${sentences.length} предложений, максимум 4.`);
    for (const s of sentences) {
      const n = s.split(/\s+/).filter(Boolean).length;
      if (n > target.maxSentence) {
        add(file, MAJOR, `Предложение из ${n} слов: "${s.slice(0, 60)}…"`);
      }
    }
  }

  // ── Лексика ──
  const lower = prose.toLowerCase();
  for (const w of VAGUE) {
    if (new RegExp(`\\b${w}\\b`).test(lower)) add(file, MAJOR, `Вагующий квантификатор "${w}" — нужна цифра или дата.`);
  }
  for (const w of FILLER) {
    if (lower.includes(w)) add(file, CRITICAL, `Стоп-слово проекта: "${w}".`);
  }
  if (target.claimWording && CLAIM_SAFE.test(prose)) {
    add(file, CRITICAL, 'Заявление вымогателя подано как подтверждённый факт. Нужно "claimed", не "breached".');
  }

  // ── Сверка чисел с брифом ──
  const briefPath = resolve(BRIEFS, file.replace(/\.md$/, '.json'));
  if (briefPerFile && existsSync(briefPath)) {
    const asOf = JSON.parse(readFileSync(briefPath, 'utf8')).site_context?.data_as_of ?? null;
    if (asOf !== SNAPSHOT_AS_OF) {
      add(
        file,
        CRITICAL,
        `Бриф собран из снапшота ${asOf ?? 'без даты'}, а текущий снапшот от ${SNAPSHOT_AS_OF}. ` +
        'Сверка чисел подтвердила бы устаревшие цифры. Запусти npm run briefs.',
      );
    }
  }
  if (briefPerFile && !existsSync(briefPath)) {
    // Critical, а не Major: без брифа сверять число не с чем, и пропустить
    // такой файл — то же самое, что не проверять его вовсе.
    add(file, CRITICAL, `Бриф ${file.replace(/\.md$/, '.json')} не найден — числа не с чем сверить. Запусти npm run briefs.`);
  } else {
    const allowed = briefPerFile
      ? numbersInBrief(JSON.parse(readFileSync(briefPath, 'utf8')))
      : GLOBAL_NUMBERS;
    const seen = new Set();
    for (const m of prose.matchAll(/\d+(?:\.\d+)?/g)) {
      const n = m[0].replace(/^0+(?=\d)/, '');
      if (!allowed.has(n) && !seen.has(n)) {
        seen.add(n);
        add(file, CRITICAL, `Числа ${n} нет в брифе. Каждое число обязано приходить из данных.`);
      }
    }
  }
}

const crit = problems.filter((p) => p.severity === CRITICAL);
const major = problems.filter((p) => p.severity === MAJOR);

console.log(`lint:content — ${targets.length} файл(ов)`);
if (problems.length === 0) {
  console.log('  ✓ замечаний нет');
  process.exit(0);
}
for (const p of problems) {
  console.log(`  ${p.severity === CRITICAL ? '✖' : '⚠'} ${p.file}: ${p.message}`);
}
console.log(`\n  Critical: ${crit.length}, Major: ${major.length}`);
if (crit.length > 0) {
  console.error('✖ Critical блокирует публикацию.');
  process.exit(1);
}
