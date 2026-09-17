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

const CONTENT = resolve(process.cwd(), 'src/content/pages');
const BRIEFS = resolve(process.cwd(), 'briefs');

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

if (!existsSync(CONTENT)) {
  console.log('lint:content — каталог src/content/pages/ пуст, проверять нечего');
  process.exit(0);
}

const files = readdirSync(CONTENT).filter((f) => f.endsWith('.md'));
if (files.length === 0) {
  console.log('lint:content — материалов пока нет');
  process.exit(0);
}

for (const file of files) {
  const raw = readFileSync(resolve(CONTENT, file), 'utf8');
  const fm = raw.match(/^---\n([\s\S]*?)\n---\n/);
  const body = fm ? raw.slice(fm[0].length) : raw;
  const prose = body.replace(/^#{1,6} .*$/gm, '').replace(/^\s*\d+\.\s/gm, '');

  // ── Символы тире ──
  if (/[—–]/.test(raw)) add(file, CRITICAL, 'Длинное или короткое тире. Точка и новое предложение, скобки или двоеточие.');

  // ── Маркеры незаполненных данных ──
  if (/\[VERIFY\]/.test(raw)) add(file, CRITICAL, 'Маркер [VERIFY] — публикация заблокирована до проверки факта.');

  // ── Заголовки ──
  if (/^# /m.test(body)) add(file, CRITICAL, 'H1 в теле: он уже есть на странице.');
  const h2 = (body.match(/^## /gm) ?? []).length;
  if (h2 !== 3) add(file, MAJOR, `Секций H2: ${h2}, ожидается 3.`);

  // ── Объём ──
  const words = prose.split(/\s+/).filter(Boolean).length;
  if (words < 250 || words > 400) add(file, MAJOR, `Слов: ${words}, требуется 250–400.`);

  // ── Абзацы ──
  for (const para of body.split(/\n\s*\n/)) {
    const p = para.trim();
    if (!p || p.startsWith('#') || /^\d+\./.test(p) || p.startsWith('---')) continue;

    const opening = p.toLowerCase();
    for (const bad of FORBIDDEN_OPENINGS) {
      if (opening.startsWith(bad)) add(file, CRITICAL, `Запрещённое начало абзаца: "${bad}".`);
    }

    const sentences = p.split(/(?<=[.!?])\s+/).filter(Boolean);
    if (sentences.length > 4) add(file, MAJOR, `Абзац из ${sentences.length} предложений, максимум 4.`);
    for (const s of sentences) {
      const n = s.split(/\s+/).filter(Boolean).length;
      if (n > 20) add(file, MAJOR, `Предложение из ${n} слов: "${s.slice(0, 60)}…"`);
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
  if (CLAIM_SAFE.test(prose)) {
    add(file, CRITICAL, 'Заявление вымогателя подано как подтверждённый факт. Нужно "claimed", не "breached".');
  }

  // ── Сверка чисел с брифом ──
  const briefPath = resolve(BRIEFS, file.replace(/\.md$/, '.json'));
  if (!existsSync(briefPath)) {
    add(file, MAJOR, `Бриф ${file.replace(/\.md$/, '.json')} не найден — числа не с чем сверить. Запусти npm run briefs.`);
  } else {
    const allowed = numbersInBrief(JSON.parse(readFileSync(briefPath, 'utf8')));
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

console.log(`lint:content — ${files.length} файл(ов)`);
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
