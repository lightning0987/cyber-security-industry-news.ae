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
import { buildMap, swapFigures } from './lib/figure-swap.mjs';
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
 * Только бесплатная починка, без обращения к модели. Нужен человеку, который
 * хочет посмотреть, что замена сделает, прежде чем платить за остальное.
 */
const freeOnly = process.argv.includes('--free-only');

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

// ─── Бесплатная починка ──────────────────────────────────────────────

/** Сколько версий брифа назад заглядывать. */
const HISTORY_DEPTH = 40;

/**
 * Карта по всей истории брифа, а не по одному шагу назад.
 *
 * Сборка могла стоять красной неделю, и тогда текст написан против брифа
 * недельной давности, а не вчерашнего. Карта, построенная по последнему
 * шагу, не содержала бы нужной пары, и бесплатная починка молча не нашла бы
 * ничего — самый неприятный вид отказа, потому что он выглядит как «нечего
 * чинить».
 *
 * Каждая историческая версия сравнивается с текущей напрямую. Цепочки
 * переходов не строятся: промежуточное значение могло принадлежать другому
 * полю, и композиция протащила бы эту ошибку дальше.
 */
function historyMap(name) {
  const file = `briefs/${name}.json`;
  let shas = [];
  try {
    shas = execFileSync('git', ['log', `-${HISTORY_DEPTH}`, '--format=%H', '--', file], {
      cwd: root,
      encoding: 'utf8',
    })
      .trim()
      .split('\n')
      .filter(Boolean);
  } catch {
    return new Map();
  }

  const now = JSON.parse(read(file));
  const seen = new Map();
  for (const sha of shas.slice(1)) {
    let past;
    try {
      past = JSON.parse(
        execFileSync('git', ['show', `${sha}:${file}`], { cwd: root, encoding: 'utf8', maxBuffer: 1e8 }),
      );
    } catch {
      continue;
    }
    for (const [from, to] of buildMap(past, now)) {
      if (!seen.has(from)) seen.set(from, new Set());
      seen.get(from).add(to);
    }
  }

  // Число, которое в разных версиях вело к разным текущим значениям,
  // отбрасывается: по тексту не определить, какая из версий имелась в виду.
  const out = new Map();
  for (const [from, to] of seen) if (to.size === 1) out.set(from, [...to][0]);
  return out;
}

const briefNames = readdirSync(resolve(root, 'briefs'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace(/\.json$/, ''));

/** Карта по одному брифу. */
const mapCache = new Map();
function mapForBrief(name) {
  if (!mapCache.has(name)) {
    mapCache.set(name, historyMap(name));
  }
  return mapCache.get(name);
}

/**
 * Общая карта для заметок и гайдов: у них своего брифа нет, числа линтер
 * сверяет со всеми сразу. Пара, которая в разных брифах ведёт к разным
 * значениям, выбрасывается — по тексту не определить, какая имелась в виду.
 */
const GLOBAL_MAP = (() => {
  const seen = new Map();
  for (const name of briefNames) {
    for (const [from, to] of mapForBrief(name)) {
      if (!seen.has(from)) seen.set(from, new Set());
      seen.get(from).add(to);
    }
  }
  const out = new Map();
  for (const [from, to] of seen) if (to.size === 1) out.set(from, [...to][0]);
  return out;
})();

function mapFor(file) {
  const name = file.replace(/^src\/content\/pages\//, '').replace(/\.md$/, '');
  return file.startsWith('src/content/pages/') && briefNames.includes(name)
    ? mapForBrief(name)
    : GLOBAL_MAP;
}

/**
 * Счётчики, принадлежащие самой сущности, а не всему снапшоту.
 *
 * Если сдвинулся такой счётчик, у страницы изменилась её собственная история,
 * и правкой одного числа дело не обойдётся. Хуже того, старое значение часто
 * встречается где-то ещё в брифе, поэтому линтер его не отмечает: страница
 * остаётся зелёной, утверждая вчерашнюю цифру.
 *
 * Именно это и случилось при первой проверке. Бесплатная замена починила
 * «19 групп» на «20», файл позеленел, перестал доходить до модели, и
 * «24 заявления» осталось стоять там, где в данных уже 25. Дыра существовала
 * и раньше, но раньше такой файл хотя бы попадал модели за компанию.
 */
const OWN_COUNT_KEYS = [
  'claims_in_this_sector',
  'claimed_uae_organisations',
  'claims_in_this_period',
  'distinct_groups_active_here',
  'sectors_targeted',
];

/** Сдвинулся ли собственный счётчик сущности за окно истории. */
function ownCountMoved(file) {
  const name = file.replace(/^src\/content\/pages\//, '').replace(/\.md$/, '');
  if (!file.startsWith('src/content/pages/') || !briefNames.includes(name)) return false;
  const facts = JSON.parse(read(`briefs/${name}.json`)).facts ?? {};
  const map = mapForBrief(name);
  return OWN_COUNT_KEYS.some((k) => {
    const v = facts[k];
    return typeof v === 'number' && [...map.values()].includes(String(v));
  });
}

/**
 * Текущий ранг сущности из её брифа. Нужен, чтобы снять вето с порядкового,
 * написанного словом: «ranks third of 47» правится только если третьим она
 * и осталась. У заметок и гайдов своей сущности нет, поэтому и ранга нет, и
 * такие предложения уходят модели.
 */
function rankFor(file) {
  const name = file.replace(/^src\/content\/pages\//, '').replace(/\.md$/, '');
  if (!file.startsWith('src/content/pages/') || !briefNames.includes(name)) return null;
  const facts = JSON.parse(read(`briefs/${name}.json`)).facts ?? {};
  const raw = facts.rank_among_sectors ?? facts.rank_among_groups;
  const m = typeof raw === 'string' ? raw.match(/^(\d+)\s+of\s+\d+$/) : null;
  return m ? Number(m[1]) : null;
}

/** Числа, которые линтер назвал отсутствующими в данных. */
function flaggedNumbers(problems) {
  const out = new Set();
  for (const p of problems) {
    const m = p.match(/Числа\s+([\d.]+)\s+нет в брифе/);
    if (m) out.add(m[1]);
  }
  return out;
}

/**
 * Прогон бесплатной починки по всем задачам починки.
 *
 * Запускается до модели. Файл, который после замены проходит линтер, до
 * API не доходит вовсе. Файл, в котором замена отказалась хотя бы от одного
 * предложения, уходит модели целиком: смешивать машинную правку с ручной в
 * одном файле незачем, модель всё равно увидит актуальные данные.
 */
function freeRepairs(repairTasks) {
  const fixed = [];
  const notes = [];
  for (const task of repairTasks) {
    const flagged = flaggedNumbers(task.problems);
    if (flagged.size === 0) continue;

    if (ownCountMoved(task.file)) {
      notes.push(`${task.file}: сдвинулся собственный счётчик сущности`);
      continue;
    }

    const before = read(task.file);
    const { text, applied, refused } = swapFigures(
      before,
      flagged,
      mapFor(task.file),
      rankFor(task.file),
    );
    if (applied.length === 0) {
      for (const r of refused) notes.push(`${task.file}: ${r.reason}`);
      continue;
    }

    writeFileSync(resolve(root, task.file), text);
    if (lintProblems(task.file).length === 0) {
      fixed.push(task.file);
      console.log(`  ₽ ${task.file} (${applied.length} замен, без API)`);
    } else {
      // Замена не довела файл до зелёного. Откат: пусть модель видит
      // исходный текст, а не наполовину исправленный.
      writeFileSync(resolve(root, task.file), before);
      for (const r of refused) notes.push(`${task.file}: ${r.reason}`);
    }
  }
  return { fixed, notes };
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
текста. Меняй только то, что перестало быть правдой.

Если правишь title или h1, они обязаны остаться разными. Дословное совпадение
блокирует сборку, а проверка, которая это ловит, работает не над файлом, а
над собранной страницей, и в замечаниях выше её не будет. Если после правки
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

/**
 * Бесплатный проход идёт первым. Платить модели за «8.8 вместо 8.6» не за
 * что: смысл предложения от этого не меняется, а там, где меняется, замена
 * сама отказывается и файл уходит модели.
 */
const free = freeRepairs(tasks.filter((t) => t.kind === 'repair'));

if (freeOnly) {
  console.log(`\nБез API починено: ${free.fixed.length} из ${tasks.length}.`);
  if (free.notes.length > 0) {
    console.log('Отказы (уйдут модели):');
    for (const n of [...new Set(free.notes)]) console.log(`  ${n}`);
  }
  process.exit(0);
}
const remaining = tasks.filter((t) => !free.fixed.includes(t.file));

if (free.fixed.length > 0) {
  console.log(`\nБез API починено: ${free.fixed.length}. Осталось модели: ${remaining.length}.`);
}

if (remaining.length === 0) {
  console.log('\nВызовов API 0, 0.000 USD.');
}

const done = free.fixed.map((file) => ({ kind: 'repair', file, attempts: 0, free: true }));
const failed = [];

for (const task of remaining) {
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

/**
 * Полная сборка в конце.
 *
 * lint:content читает по одному файлу и не видит правил, которые живут в
 * пост-билд гардах: уникальность title и description по всему сайту,
 * совпадение h1 с title, целостность ссылок. Починка однажды переписала
 * заголовок так, что он совпал с title, все 39 файлов прошли линтер, и
 * ветка всё равно не собиралась.
 *
 * Результат не блокирует коммит: текст уже написан и выбрасывать его из-за
 * одного заголовка дороже, чем поправить руками. Но он обязан попасть в
 * сводку, а значит в тело pull request и в Telegram. Ветка, про которую
 * думают, что она зелёная, хуже ветки, про которую известно, что она нет.
 */
let buildNote = null;
let buildOk = false;
if (done.length > 0) {
  try {
    execFileSync('npm', ['run', 'build'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    buildNote = 'Полная сборка проходит, гарды зелёные.';
    buildOk = true;
    console.log('\n✓ полная сборка проходит');
  } catch (err) {
    const out = `${err.stdout ?? ''}${err.stderr ?? ''}`;
    const hits = out
      .split('\n')
      .filter((l) => l.includes('✖') || l.includes('•'))
      .slice(0, 12)
      .map((l) => l.trim());
    buildNote = ['ВНИМАНИЕ: полная сборка НЕ проходит. Чинить руками до мёржа:', ...hits].join('\n');
    console.log(`\n✖ полная сборка не проходит\n${hits.join('\n')}`);
  }
}

const cost = (usage.input / 1e6) * 2 + (usage.output / 1e6) * 10;
const summary = [
  `Готово: ${done.length} из ${tasks.length}.`,
  free.fixed.length > 0
    ? `Без API: ${free.fixed.length} (замена числа, смысл не затронут). Модели ушло ${remaining.length}.`
    : null,
  done.length > 0
    ? done.map((t) => `  ${t.kind}${t.free ? ' (без API)' : ''}: ${t.file}`).join('\n')
    : null,
  failed.length > 0 ? `Не прошли проверку: ${failed.map((t) => t.file).join(', ')}` : null,
  buildNote,
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
  // Машинный признак для workflow: публиковать сразу или звать человека.
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `build_ok=${buildOk}\n`);
}
