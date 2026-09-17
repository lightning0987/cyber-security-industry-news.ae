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

/** По одной странице каждого типа: полный обход тут избыточен. */
function samplePaths() {
  const dist = 'dist';
  const found = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir)) {
      const full = join(dir, e);
      if (statSync(full).isDirectory()) walk(full);
      else if (e === 'index.html') found.push(`/${relative(dist, dir)}/`.replace(/^\/\.\//, '/'));
    }
  };
  walk(dist);
  const pick = (re) => found.find((p) => re.test(p));
  return [...new Set([
    '/',
    pick(/^\/uae-ransomware-tracker\/$/),
    pick(/^\/uae-ransomware-tracker\/[a-z]/),
    pick(/^\/ransomware-groups-targeting-uae\/[a-z]/),
    pick(/^\/guides\/[a-z]/),
    pick(/^\/news\/$/),
    pick(/^\/category\/[a-z]/),
    found.find((p) => /^\/[a-z0-9-]+\/$/.test(p) && !/(guides|news|category|about|methodology|sitemap|data-sources|editorial-policy|uae-ransomware-tracker|ransomware-groups)/.test(p)),
    '/methodology/',
  ].filter(Boolean))];
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
