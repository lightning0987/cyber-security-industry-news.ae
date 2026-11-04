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
import { existsSync, readFileSync, readdirSync, writeFileSync, unlinkSync } from 'node:fs';
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

/**
 * События — повод написать заметку, но не единственный повод работать:
 * список починок приходит от линтера. Поэтому неразобранный вывод events
 * здесь не фатален, иначе сломанный сайт остался бы несломанным-чинимым
 * из-за дня, когда данные не менялись.
 */
const events = (() => {
  const raw = execFileSync('node', eventsArgs, { cwd: root, encoding: 'utf8' });
  try {
    return JSON.parse(raw);
  } catch {
    console.log(`events не отдал JSON, заметок в этом прогоне не будет: ${raw.trim().split('\n')[0]}`);
    return { added: [], moved_figures: [] };
  }
})();

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
 * Починки берутся у линтера, а не у events.
 *
 * events считает заявления по секторам, группам и периодам. Этого мало:
 * общие цифры снапшота — сколько всего групп, среднее на сектор, доли в
 * процентах — стоят почти в каждом файле и в его отчёт не попадают. Одна
 * новая группа в данных ломает все страницы групп сразу, а events назовёт
 * ноль из них. Линтер же знает про каждый сломанный файл поimени и говорит,
 * какое именно число перестало приходить из данных.
 *
 * Потолка на число починок нет намеренно. Сломанный файл держит сборку
 * красной, а значит и весь сайт на прошлой версии. Починить половину значит
 * заплатить и не починить ничего.
 */
const SITE_CONTEXT = (() => {
  const any = readdirSync(resolve(root, 'briefs')).find((f) => f.endsWith('.json'));
  if (!any) return '';
  const brief = JSON.parse(read(`briefs/${any}`));
  return JSON.stringify({ site_context: brief.site_context }, null, 2);
})();

/** Брифы сущностей, названных во frontmatter материала. */
function briefsForEntities(text) {
  const out = [];
  for (const kind of ['sectors', 'groups', 'periods']) {
    const line = text.match(new RegExp(`^\\s*${kind}:\\s*\\[(.*)\\]`, 'm'));
    if (!line) continue;
    for (const raw of line[1].split(',')) {
      const slug = raw.trim().replace(/^["']|["']$/g, '');
      if (!slug) continue;
      const prefix = kind === 'sectors' ? 'sector' : kind === 'groups' ? 'group' : 'period';
      const b = briefByName(`${prefix}-${slug}`);
      if (b) out.push(b);
    }
  }
  return out;
}

/**
 * Чем подкрепить починку. У страницы данных есть свой бриф. У заметки и
 * гайда своего брифа нет: линтер сверяет их числа со всеми брифами сразу,
 * поэтому им нужен общий контекст снапшота плюс брифы названных сущностей.
 */
function repairContext(file) {
  const page = briefFor(file);
  if (page) return page;
  const text = read(file);
  const entities = file.startsWith('src/content/news/') ? briefsForEntities(text) : [];
  return [SITE_CONTEXT, ...entities].join('\n\n');
}

const DIRS = ['src/content/pages', 'src/content/news', 'src/content/guides'];

for (const [name, problems] of lintByFile()) {
  const dir = DIRS.find((d) => exists(`${d}/${name}`));
  if (!dir) continue;
  const file = `${dir}/${name}`;
  tasks.push({ kind: 'repair', file, problems, brief: repairContext(file) });
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
  const problems = task.problems.map((p) => `  ${p}`).join('\n');
  return `${rules}

---

# Задача: починить существующий файл

Снапшот обновился, и файл ниже больше не сходится с данными. Проверка
отклонила его вот за это:

${problems}

Каждое названное число устарело. Найди в данных ниже актуальное значение и
поставь его. Если актуального значения там нет, перепиши предложение так,
чтобы это число стало не нужно.

Правь минимально. Сохрани структуру, заголовки, frontmatter и аргумент
текста. Меняй только то, что перестало быть правдой. Если после правки
предложение потеряло смысл, перепиши это предложение, а не абзац.

Верни целиком готовый файл markdown вместе с frontmatter, и ничего больше.
Без markdown-ограждения вокруг ответа.

## Текущий файл ${task.file}

${read(task.file)}

## Актуальные данные

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

/** Один прогон линтера. Возвращает Critical-замечания, сгруппированные по файлу. */
function lintByFile() {
  let out = '';
  try {
    // stderr перехватывается, а не наследуется: иначе вывод линтера печатается
    // поверх отчёта генератора и читается как его собственная ошибка.
    out = execFileSync('node', ['scripts/lint-content.mjs'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (err) {
    out = `${err.stdout ?? ''}${err.stderr ?? ''}`;
  }
  const byName = new Map();
  for (const raw of out.split('\n')) {
    const m = raw.match(/✖\s+([^\s:]+\.md):\s*(.+)$/);
    if (!m) continue;
    if (!byName.has(m[1])) byName.set(m[1], []);
    byName.get(m[1]).push(m[2].trim());
  }
  return byName;
}

/** Замечания по одному файлу. */
function lintProblems(file) {
  return lintByFile().get(file.split('/').pop()) ?? [];
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
