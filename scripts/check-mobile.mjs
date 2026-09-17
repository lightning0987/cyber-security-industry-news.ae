#!/usr/bin/env node
/**
 * Проверка горизонтального переполнения на узком экране.
 *
 * Живёт отдельно от пост-билд гардов, потому что требует браузера: linkedom
 * парсит HTML, но не считает раскладку, а переполнение — это свойство раскладки.
 *
 * ЗАЧЕМ. Один трек grid с шириной 1fr имеет неявный min-width: auto, и широкая
 * таблица растягивает его вместе со всей страницей. На 390px это обрезало
 * заголовок, текст и таблицы одновременно, и в вёрстке этого не видно.
 *
 * Запуск: npm run preview, затем npm run check:mobile
 */
import { createRequire } from 'node:module';
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const require = createRequire('/Users/vladimir/.npm-global/lib/node_modules/');
const puppeteer = require('/Users/vladimir/.npm-global/lib/node_modules/puppeteer');

const BASE = process.argv[2] ?? 'http://localhost:4321';
const WIDTHS = [360, 390, 768];

/**
 * По одной странице каждого типа: полный обход тут избыточен.
 *
 * Типы перечислены явно, и НЕНАЙДЕННЫЙ ТИП — ЭТО ОШИБКА. Раньше промах шаблона
 * молча выпадал через filter(Boolean): после переноса материалов на /news/
 * проверка стала обходить восемь страниц вместо девяти и никому об этом не
 * сказала. Проверка, которая тихо уменьшает охват, хуже отсутствующей.
 */
const PAGE_TYPES = [
  ['главная', /^\/$/],
  ['хаб трекера', /^\/uae-ransomware-tracker\/$/],
  ['сектор или период', /^\/uae-ransomware-tracker\/[a-z0-9]/],
  ['профиль группы', /^\/ransomware-groups-targeting-uae\/[a-z0-9]/],
  ['гайд', /^\/guides\/[a-z]/],
  ['хаб новостей', /^\/news\/$/],
  ['материал', /^\/news\/(?!category\/|archive\/)[a-z0-9-]+\/$/],
  ['рубрика', /^\/news\/category\/[a-z]/],
  ['архив месяца', /^\/news\/archive\/\d{4}\/\d{2}\/$/],
  ['методология', /^\/methodology\/$/],
];

function samplePaths() {
  const dist = 'dist';
  const found = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir)) {
      const full = join(dir, e);
      if (statSync(full).isDirectory()) walk(full);
      // Корень даёт пустой relative и превратился бы в "//"
      else if (e === 'index.html') found.push(`/${relative(dist, dir)}/`.replace(/\/+/g, '/'));
    }
  };
  walk(dist);

  const paths = [];
  const missing = [];
  for (const [name, re] of PAGE_TYPES) {
    const hit = found.find((p) => re.test(p));
    if (hit) paths.push(hit);
    else missing.push(name);
  }
  if (missing.length > 0) {
    console.error(`✖ Типов страниц не найдено в dist/: ${missing.join(', ')}.`);
    console.error('  Либо структура URL изменилась, либо страницы не собрались. Список типов в PAGE_TYPES.');
    process.exit(1);
  }
  return [...new Set(paths)];
}

const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();
const failures = [];

for (const path of samplePaths()) {
  for (const width of WIDTHS) {
    await page.setViewport({ width, height: 900 });
    await page.goto(BASE + path, { waitUntil: 'networkidle0', timeout: 30000 });
    const r = await page.evaluate(() => ({
      vw: document.documentElement.clientWidth,
      sw: document.documentElement.scrollWidth,
      worst: [...document.querySelectorAll('main *')]
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
        .filter((x) => x.r.right > document.documentElement.clientWidth + 1)
        .map((x) => `${x.el.tagName.toLowerCase()}.${(x.el.className || '').toString().split(' ')[0]}`)
        .slice(0, 3),
    }));
    if (r.sw > r.vw + 1) {
      failures.push(`${path} @ ${width}px: scrollWidth ${r.sw} против ${r.vw}. Виновники: ${r.worst.join(', ') || 'не определены'}`);
    }
  }
}
await browser.close();

console.log(`check:mobile — ${samplePaths().length} страниц × ${WIDTHS.length} ширин`);
if (failures.length === 0) {
  console.log('  ✓ горизонтального переполнения нет');
  process.exit(0);
}
for (const f of failures) console.error(`  ✖ ${f}`);
console.error(`\n✖ Горизонтальное переполнение на ${failures.length} комбинаци(ях).`);
process.exit(1);
