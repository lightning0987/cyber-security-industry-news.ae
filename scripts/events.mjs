#!/usr/bin/env node
/**
 * Что изменилось в данных с прошлого снапшота.
 *
 * Нужен для ручного цикла публикации: раз в несколько дней человек приходит,
 * смотрит поводы и пишет материалы. Без этого скрипта пришлось бы читать дифф
 * JSON на 182 записи глазами, а это и долго, и ненадёжно.
 *
 * Триггеры по разделу 8.2 ТЗ: новая жертва, новая группа, всплеск по сектору.
 * К ним добавлен четвёртый, которого в ТЗ нет и который на практике важнее
 * всех: СПИСОК СТРАНИЦ, ГДЕ ЦИФРА В ТЕКСТЕ РАЗОШЛАСЬ С ДАННЫМИ. Именно он
 * гасит деплой после ночного обновления, и именно его нужно чинить первым.
 *
 * Предыдущее состояние берётся из истории git, отдельной базы нет.
 * Запуск: npm run events [-- --json] [-- --against <ref>]
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { PERIODS } from '../src/lib/routes.mjs';

const SNAPSHOT_PATH = 'src/data/ransomware-live-ae.json';
const asJson = process.argv.includes('--json');
const againstIndex = process.argv.indexOf('--against');
const againstRef = againstIndex > -1 ? process.argv[againstIndex + 1] : null;
// Сравнение с сохранённым файлом: нужно и для проверки самого скрипта, и на
// случай, когда снапшот нужно сверить с копией, которой нет в истории git.
const fileIndex = process.argv.indexOf('--against-file');
const againstFile = fileIndex > -1 ? process.argv[fileIndex + 1] : null;

/** Записи, попадающие в публикуемые цифры. Заголовки считаются только по ним. */
const attributed = (records) => records.filter((r) => r.ae_confidence !== 'unverified');

function git(command) {
  return execSync(command, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

/**
 * Состояние снапшота до текущего.
 *
 * Берём не HEAD~1, а последнюю ревизию файла, которая ОТЛИЧАЕТСЯ от текущей:
 * снапшот меняется не каждым коммитом, и сравнение с соседним коммитом почти
 * всегда давало бы пустой список событий.
 */
function previousSnapshot(current) {
  if (againstFile) {
    return { ref: againstFile, data: JSON.parse(readFileSync(resolve(process.cwd(), againstFile), 'utf8')) };
  }
  if (againstRef) {
    return { ref: againstRef, data: JSON.parse(git(`git show ${againstRef}:${SNAPSHOT_PATH}`)) };
  }
  const shas = git(`git log --format=%H -- ${SNAPSHOT_PATH}`).trim().split('\n').filter(Boolean);
  const currentJson = JSON.stringify(current.records);
  for (const sha of shas) {
    let data;
    try {
      data = JSON.parse(git(`git show ${sha}:${SNAPSHOT_PATH}`));
    } catch {
      continue;
    }
    if (JSON.stringify(data.records) !== currentJson) return { ref: sha.slice(0, 7), data };
  }
  return null;
}

const countBy = (records, key) => {
  const out = new Map();
  for (const r of records) {
    const k = r[key];
    if (k === null || k === undefined) continue;
    out.set(k, (out.get(k) ?? 0) + 1);
  }
  return out;
};

const periodOf = (year) => PERIODS.find((p) => year >= p.from && year <= p.to)?.slug ?? null;

function periodCounts(records) {
  const out = new Map();
  for (const r of records) {
    const slug = periodOf(r.year);
    if (slug) out.set(slug, (out.get(slug) ?? 0) + 1);
  }
  return out;
}

/** Сколько заявлений у сектора за последние N дней. */
function recent(records, sector, days, asOf) {
  const cutoff = new Date(asOf);
  cutoff.setUTCDate(cutoff.getUTCDate() - days);
  const iso = cutoff.toISOString().slice(0, 10);
  return records.filter((r) => r.sector === sector && r.discovered >= iso).length;
}

// ─── Сбор ────────────────────────────────────────────────────────────

const current = JSON.parse(readFileSync(resolve(process.cwd(), SNAPSHOT_PATH), 'utf8'));
const prev = previousSnapshot(current);

if (!prev) {
  console.log('events: предыдущего снапшота в истории нет, сравнивать не с чем.');
  process.exit(0);
}

const nowAll = current.records;
const wasAll = prev.data.records;
const now = attributed(nowAll);
const was = attributed(wasAll);

const wasIds = new Set(was.map((r) => r.id));
const nowIds = new Set(now.map((r) => r.id));

const added = now.filter((r) => !wasIds.has(r.id));
const removed = was.filter((r) => !nowIds.has(r.id));

const wasGroups = new Set(was.map((r) => r.group_slug));
const newGroups = [...new Set(added.map((r) => r.group_slug))].filter((g) => !wasGroups.has(g));

const wasSectors = new Set(was.filter((r) => r.sector).map((r) => r.sector));
const newSectors = [...new Set(added.map((r) => r.sector).filter(Boolean))].filter(
  (s) => !wasSectors.has(s),
);

/**
 * Всплеск: за последние 90 дней сектор получил вдвое больше среднего
 * за такой же отрезок по всей своей истории. Порог из раздела 8.2 ТЗ.
 *
 * Считается для ОБОИХ снапшотов, и репортится только то, чего не было раньше.
 * Всплеск — свойство текущих данных, а не изменения: если считать его по
 * одному снапшоту, он попадёт в отчёт при каждом запуске, включая прогоны,
 * где не изменилось вообще ничего. Повод, который повторяется каждый раз,
 * перестают читать.
 */
function spikesIn(records, asOfDate) {
  const out = new Map();
  for (const [sector] of countBy(records, 'sector')) {
    const ofSector = records.filter((r) => r.sector === sector);
    const last90 = recent(records, sector, 90, asOfDate);
    const first = ofSector.map((r) => r.discovered).sort()[0];
    const spanDays = Math.max(90, (new Date(asOfDate) - new Date(first)) / 86400000);
    const expected = (ofSector.length / spanDays) * 90;
    if (last90 >= 2 && expected > 0 && last90 >= expected * 2) {
      out.set(sector, { sector, last90, expected: Math.round(expected * 10) / 10, total: ofSector.length });
    }
  }
  return out;
}

const asOf = current.fetched_at.slice(0, 10);
const spikesNow = spikesIn(now, asOf);
const spikesWas = spikesIn(was, prev.data.fetched_at.slice(0, 10));
const spikes = [...spikesNow.values()].filter((s) => !spikesWas.has(s.sector));

/**
 * Страницы, чья цифра сдвинулась. Каждая такая страница несёт редакционный
 * абзац с этим числом, и после обновления данных текст врёт, пока его не
 * поправят. lint:content уронит сборку — здесь он просто назван заранее.
 */
const moved = [];

/**
 * Файл редакционного текста сущности. Страница есть не у каждой группы:
 * порог — два заявления, поэтому путь проверяется, а не собирается на веру.
 */
function contentFile(prefix, slug) {
  const path = `src/content/pages/${prefix}-${slug}.md`;
  return existsSync(resolve(process.cwd(), path)) ? path : null;
}

const compare = (label, file, a, b) => {
  if (a !== b) moved.push({ label, file, was: a, now: b });
};

compare('Всего атрибутировано', null, was.length, now.length);
const sectorsNow = countBy(now, 'sector');
const sectorsWas = countBy(was, 'sector');
for (const sector of new Set([...sectorsNow.keys(), ...sectorsWas.keys()])) {
  compare(`Сектор ${sector}`, contentFile('sector', sector), sectorsWas.get(sector) ?? 0, sectorsNow.get(sector) ?? 0);
}
const groupsNow = countBy(now, 'group_slug');
const groupsWas = countBy(was, 'group_slug');
for (const group of new Set([...groupsNow.keys(), ...groupsWas.keys()])) {
  compare(`Группа ${group}`, contentFile('group', group), groupsWas.get(group) ?? 0, groupsNow.get(group) ?? 0);
}
const periodsNow = periodCounts(now);
const periodsWas = periodCounts(was);
for (const period of new Set([...periodsNow.keys(), ...periodsWas.keys()])) {
  compare(`Период ${period}`, contentFile('period', period), periodsWas.get(period) ?? 0, periodsNow.get(period) ?? 0);
}

const report = {
  from: { ref: prev.ref, fetched_at: prev.data.fetched_at, attributed: was.length },
  to: { ref: 'working tree', fetched_at: current.fetched_at, attributed: now.length },
  added: added.map((r) => ({
    group: r.group, group_slug: r.group_slug, sector: r.sector_label ?? 'unclassified',
    sector_slug: r.sector, discovered: r.discovered, confidence: r.ae_confidence,
  })),
  removed: removed.length,
  new_groups: newGroups,
  new_sectors: newSectors,
  spikes,
  moved_figures: moved,
};

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

// ─── Человеческий отчёт ──────────────────────────────────────────────

const line = (s = '') => console.log(s);

line(`events: ${prev.ref} (${prev.data.fetched_at.slice(0, 10)}) → текущий снапшот (${asOf})`);
line(`  атрибутировано было ${was.length}, стало ${now.length}`);
line();

if (moved.length > 0) {
  line(`ЧИНИТЬ ПЕРВЫМ — цифры в тексте разошлись с данными (${moved.length}):`);
  for (const m of moved) {
    const where = m.file ?? 'страницы своего файла не имеет, число встречается в чужих текстах';
    line(`  ✖ ${m.label}: ${m.was} → ${m.now}`);
    line(`      ${where}`);
  }
  line('  Точный список предложений даст: npm run briefs && npm run lint:content');
  line('  До этого сборка падает, и деплой не проходит.');
  line();
}

if (added.length > 0) {
  line(`ПОВОДЫ ДЛЯ ЗАМЕТКИ (T1) — новых заявлений ${added.length}:`);
  for (const r of added) {
    line(`  · ${r.group_slug} — ${r.sector_label ?? 'сектор не классифицирован'}, ${r.discovered} (${r.ae_confidence})`);
  }
  line();
}

if (newGroups.length > 0) {
  line(`ПОВОД ДЛЯ РАЗБОРА (T2) — группа в наборе ОАЭ впервые: ${newGroups.join(', ')}`);
  line();
}
if (newSectors.length > 0) {
  line(`ПОВОД ДЛЯ РАЗБОРА (T2) — сектор получил первое заявление: ${newSectors.join(', ')}`);
  line();
}
if (spikes.length > 0) {
  line('ПОВОД ДЛЯ РАЗБОРА (T2) — всплеск по сектору:');
  for (const s of spikes) line(`  · ${s.sector}: ${s.last90} за 90 дней против ожидаемых ${s.expected}`);
  line();
}
if (removed.length > 0) {
  line(`⚠ Из набора исчезло заявлений: ${removed.length}. Апстрим снял записи, счётчики упадут.`);
  line();
}

if (added.length === 0 && moved.length === 0 && newGroups.length === 0 && spikes.length === 0) {
  line('Ничего не изменилось. Публиковать нечего, править нечего.');
}
