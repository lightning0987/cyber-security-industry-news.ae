/**
 * Генератор редакционного текста. Вызывается ТОЛЬКО когда в данных что-то
 * произошло, и делает ровно две работы:
 *
 *   1. repair — чинит абзац, чья цифра разошлась со снапшотом. Это то, что
 *      иначе роняет сборку и останавливает деплой до прихода человека.
 *   2. news   — пишет короткую заметку T1 о новом заявлении.
 *
 * Выдуманная цифра сюда не пролезет, и не потому что модель хорошая:
 * lint:content сверяет каждое число в тексте с брифом, собранным из снапшота.
 * Проверка появилась раньше генератора и не знает, кто написал файл. Результат
 * каждого вызова прогоняется через неё, и файл, который её не прошёл, не
 * сохраняется. Поэтому генератор пишет в ветку, а не в main.
 */

import Anthropic from '@anthropic-ai/sdk';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';

const MODEL = 'claude-sonnet-5-5';
const MAX_ATTEMPTS = 3;

/** Потолок на прогон. Всплеск в данных не должен превращаться в счёт. */
const MAX_NEWS_PER_RUN = 3;

const root = process.cwd();
const dryRun = process.argv.includes('--dry-run');

/**
 * База сравнения передаётся в events как есть. Нужна, когда чинишь текст
 * после серии красных сборок: events по умолчанию отвечает «что изменилось
 * со вчера», а разъехаться цифры могли неделю назад.
 */
const againstIdx = process.argv.indexOf('--against-file');
const eventsArgs = ['scripts/events.mjs', '--json'];
if (againstIdx !== -1) eventsArgs.push('--against-file', process.argv[againstIdx + 1]);
const read = (p) => readFileSync(resolve(root, p), 'utf8');
const exists = (p) => existsSync(resolve(root, p));

const usage = { input: 0, output: 0, calls: 0 };

// ─── Что произошло в данных ──────────────────────────────────────────

const events = JSON.parse(
  execFileSync('node', eventsArgs, { cwd: root, encoding: 'utf8' }),
);

const rules = read('prompts/content-brief.md');
const snapshotAsOf = events.to.fetched_at.slice(0, 10);

/** Бриф страницы лежит рядом по имени: sector-education.md ↔ sector-education.json */
function briefFor(contentFile) {
  const name = contentFile.replace(/^src\/content\/pages\//, '').replace(/\.md$/, '');
  const path = `briefs/${name}.json`;
  return exists(path) ? read(path) : null;
}

function briefByName(name) {
  const path = `briefs/${name}.json`;
  return exists(path) ? read(path) : null;
}

// ─── Список задач ────────────────────────────────────────────────────

const tasks = [];

/**
 * Одна страница может нести несколько разошедшихся цифр. Чинить её нужно
 * один раз и целиком: бриф у неё один, и второй вызов переписал бы первый.
 */
const byFile = new Map();
for (const m of events.moved_figures) {
  if (!m.file || !exists(m.file)) continue;
  if (!byFile.has(m.file)) byFile.set(m.file, []);
  byFile.get(m.file).push(m);
}
for (const [file, moved] of byFile) {
  const brief = briefFor(file);
  if (!brief) continue;
  tasks.push({ kind: 'repair', file, moved, brief });
}

/** Заметки — по новым заявлениям, самые свежие первыми. */
const news = [...events.added]
  .sort((a, b) => b.discovered.localeCompare(a.discovered))
  .slice(0, MAX_NEWS_PER_RUN);

const IMAGES = {
  transportation: 'container-port',
  'financial-services': 'financial-district',
  'government-defense': 'government',
  healthcare: 'hospital',
  hospitality: 'hotel-lobby',
  technology: 'data-centre',
  telecommunications: 'fibre-network',
  'energy-utilities': 'substation',
  manufacturing: 'factory',
};

for (const claim of news) {
  const slug = `${claim.group_slug}-${claim.sector_slug ?? 'unclassified'}-${claim.discovered.slice(0, 7)}`;
  const file = `src/content/news/${slug}.md`;
  if (exists(file)) continue;
  if (slug.startsWith('category') || slug.startsWith('archive')) continue;
  tasks.push({
    kind: 'news',
    file,
    claim,
    image: IMAGES[claim.sector_slug] ?? 'dubai-skyline',
    brief: [briefByName(`group-${claim.group_slug}`), briefByName(`sector-${claim.sector_slug}`)]
      .filter(Boolean)
      .join('\n\n'),
  });
}

if (tasks.length === 0) {
  console.log('Ничего не изменилось так, чтобы требовался текст. Вызовов API: 0.');
  process.exit(0);
}

console.log(`Задач: ${tasks.length}`);
for (const t of tasks) console.log(`  ${t.kind.padEnd(6)} ${t.file}`);

if (dryRun) {
  console.log('\n--dry-run: API не вызывался.');
  process.exit(0);
}

// ─── Промпты ─────────────────────────────────────────────────────────

function repairPrompt(task) {
  const moved = task.moved.map((m) => `  ${m.label}: было ${m.was}, стало ${m.now}`).join('\n');
  return `${rules}

---

# Задача: починить цифры на существующей странице

Снапшот обновился, и текст ниже теперь противоречит данным. Сдвинулось вот что:

${moved}

Правь минимально. Сохрани структуру, три H2, заголовки и аргумент текста.
Меняй только то, что перестало быть правдой из-за новых цифр. Если после
правки предложение стало бессмысленным, перепиши это предложение, а не абзац.

Сохрани поле summary во frontmatter. Если цифра есть в нём, поправь и там.

Верни целиком готовый файл markdown вместе с frontmatter, и ничего больше.
Без markdown-ограждения вокруг ответа.

## Текущий файл ${task.file}

${read(task.file)}

## Актуальный бриф

${task.brief}`;
}

function newsPrompt(task) {
  const c = task.claim;
  return `${rules}

---

# Задача: короткая заметка T1 о новом заявлении

Мониторинг сайтов утечек зафиксировал новое заявление:

  группа: ${c.group}
  сектор: ${c.sector}
  дата обнаружения: ${c.discovered}
  уверенность атрибуции к ОАЭ: ${c.confidence}

Это новость, а не страница данных. Формат другой, правила письма те же.

Объём 250–400 слов. Первый абзац без заголовка: что зафиксировано и когда.
Затем три H2, каждый делает утверждение, а не называет тему. Последний абзац
напоминает, что заявление на сайте утечки это утверждение атакующего, а не
подтверждённый взлом, и что проект не называет организацию.

Вставь два или три контекстных внутренних ссылки прямо в предложения.
Якорь это имя сущности. Пути: /uae-ransomware-tracker/<сектор>/,
/ransomware-groups-targeting-uae/<группа>/, /uae-ransomware-tracker/<год>/.
Ставь ссылку только на то, что упомянуто в брифе ниже.

Верни целиком файл markdown с таким frontmatter и ничего больше,
без markdown-ограждения вокруг ответа:

---
title: "от 45 до 65 символов, ключевая фраза в первых 60, число раньше"
h1: "чистая именная группа, не совпадает с title"
description: "от 80 до 158 символов, в первом предложении число и точка"
dek: "от 60 до 320 символов, нетривиальный факт, а не пересказ заголовка"
category: "ransomware"
tier: "T1"
published: "${snapshotAsOf}"
entities:
  sectors: ["${c.sector_slug ?? ''}"]
  groups: ["${c.group_slug}"]
  periods: ["${c.discovered.slice(0, 4)}"]
image: "${task.image}"
sources:
  - label: "описательный якорь"
    href: "/путь/"
---

Источников от 2 до 7. Последним всегда:
  - label: "ransomware.live, leak-site monitoring"
    href: "https://www.ransomware.live/"

## Брифы с фактами

${task.brief}`;
}

// ─── Проверка: линтер решает, сохранять ли файл ───────────────────────

/** Возвращает Critical-замечания линтера, относящиеся именно к этому файлу. */
function lintProblems(file) {
  let out = '';
  try {
    out = execFileSync('node', ['scripts/lint-content.mjs'], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env },
    });
  } catch (err) {
    out = `${err.stdout ?? ''}${err.stderr ?? ''}`;
  }
  const name = file.split('/').pop();
  return out
    .split('\n')
    .filter((l) => l.includes('✖') && l.includes(name))
    .map((l) => l.trim());
}

// ─── Выполнение ──────────────────────────────────────────────────────

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/** Модель иногда оборачивает ответ в ограждение, несмотря на запрет. */
function unfence(text) {
  const t = text.trim();
  const m = t.match(/^```(?:markdown|md)?\n([\s\S]*)\n```$/);
  return (m ? m[1] : t).trim() + '\n';
}

const done = [];
const failed = [];

for (const task of tasks) {
  const before = exists(task.file) ? read(task.file) : null;
  const messages = [
    { role: 'user', content: task.kind === 'repair' ? repairPrompt(task) : newsPrompt(task) },
  ];
  let saved = false;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const res = await client.messages.create({
      model: MODEL,
      // Потолок с запасом: при adaptive thinking рассуждение тоже считается
      // выходом, и обрезанный ответ выглядел бы как нарушение формата.
      max_tokens: 8000,
      thinking: { type: 'adaptive' },
      messages,
    });
    usage.calls += 1;
    usage.input += res.usage.input_tokens;
    usage.output += res.usage.output_tokens;

    const text = res.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('');
    writeFileSync(resolve(root, task.file), unfence(text));

    const problems = lintProblems(task.file);
    if (problems.length === 0) {
      console.log(`  ✓ ${task.file} (попытка ${attempt})`);
      done.push({ ...task, attempts: attempt });
      saved = true;
      break;
    }

    console.log(`  ⟲ ${task.file}: попытка ${attempt} отклонена линтером`);
    // Назад уходит res.content целиком, а не только текст: блоки рассуждения
    // принадлежат своему ходу, и собранный вручную ход их бы потерял.
    messages.push({ role: 'assistant', content: res.content });
    messages.push({
      role: 'user',
      content: `Линтер отклонил ответ. Исправь ровно это и верни файл целиком:\n\n${problems.join('\n')}`,
    });
  }

  if (!saved) {
    // Файл, который не прошёл проверку, не остаётся на диске ни в каком виде.
    if (before === null) unlinkSync(resolve(root, task.file));
    else writeFileSync(resolve(root, task.file), before);
    console.log(`  ✖ ${task.file}: ${MAX_ATTEMPTS} попытки не прошли проверку, файл не тронут`);
    failed.push(task);
  }
}

// ─── Отчёт ───────────────────────────────────────────────────────────

const cost = (usage.input / 1e6) * 2 + (usage.output / 1e6) * 10;
const summary = [
  `Готово: ${done.length} из ${tasks.length}.`,
  done.length > 0 ? done.map((t) => `  ${t.kind}: ${t.file}`).join('\n') : null,
  failed.length > 0 ? `Не прошли проверку: ${failed.map((t) => t.file).join(', ')}` : null,
  `Вызовов API ${usage.calls}, токенов ${usage.input} вход и ${usage.output} выход, ${cost.toFixed(3)} USD.`,
]
  .filter(Boolean)
  .join('\n');

console.log(`\n${summary}`);

/**
 * Сводка кладётся в файл, а не только в output шага: её читает и тело pull
 * request, и сообщение в Telegram, и оба читают её в том же шаге, где она
 * появилась. Шаг не может сослаться на собственный output.
 */
writeFileSync(process.env.MARSAD_SUMMARY_FILE ?? '/tmp/marsad-summary.txt', summary + '\n');

if (process.env.GITHUB_OUTPUT) {
  const fs = await import('node:fs');
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `written=${done.length}\n`);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `cost=${cost.toFixed(3)}\n`);
}
