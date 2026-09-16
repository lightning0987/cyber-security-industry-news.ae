/**
 * Граф внутренних ссылок.
 *
 * Перелинковка здесь не оформление, а основной механизм: за счёт неё краулер
 * доходит до глубоких страниц и передаётся вес. Поэтому её свойства проверяются
 * кодом, а не глазами.
 *
 * Граф строится ИЗ СОБРАННОГО HTML, а не из шаблонов. Ссылка, которую рисует
 * JavaScript, в этот граф не попадёт — что и требуется: краулер её тоже не увидит.
 */

export const name = 'link-graph';

/**
 * Страницы вне графа. 404 недостижима по ссылке по определению: её отдаёт
 * сервер, а не навигация, поэтому требовать для неё входящих бессмысленно.
 */
const EXEMPT_KEYS = new Set(['/404.html']);

const MIN_INBOUND = 3;
const MAX_DEPTH = 3;

const toKey = (p) => `/${p.replace(/index\.html$/, '')}`.replace(/\/+/g, '/');

export function run({ pages }) {
  const failures = [];

  const known = new Set(pages.map((p) => toKey(p.path)));
  const inbound = new Map([...known].map((k) => [k, new Set()]));
  const outbound = new Map();

  for (const { path, doc } of pages) {
    const from = toKey(path);
    const targets = new Set();

    for (const a of doc.querySelectorAll('a[href]')) {
      const href = a.getAttribute('href') ?? '';
      if (!href.startsWith('/') || href.startsWith('//')) continue;
      const target = href.split('#')[0].split('?')[0];
      const key = target.replace(/\/+/g, '/');

      // Ссылка на несуществующую страницу — битая.
      const isFile = /\.[a-z0-9]+$/i.test(key);
      if (!known.has(key) && !isFile) {
        failures.push(`${path}: битая внутренняя ссылка на ${key}`);
        continue;
      }
      if (isFile) continue;
      targets.add(key);
      if (key !== from) inbound.get(key)?.add(from);
    }
    outbound.set(from, targets);
  }

  // Сироты и недостаток входящих.
  for (const [key, sources] of inbound) {
    if (EXEMPT_KEYS.has(key) || key === '/') continue;
    if (sources.size === 0) failures.push(`Страница-сирота, ноль входящих ссылок: ${key}`);
    else if (sources.size < MIN_INBOUND) {
      failures.push(`Слабая связность: ${key} имеет ${sources.size} входящих, нужно ≥${MIN_INBOUND}`);
    }
  }

  // Глубина клика от главной, поиск в ширину.
  const depth = new Map([['/', 0]]);
  const queue = ['/'];
  while (queue.length > 0) {
    const cur = queue.shift();
    for (const next of outbound.get(cur) ?? []) {
      if (!depth.has(next)) {
        depth.set(next, depth.get(cur) + 1);
        queue.push(next);
      }
    }
  }
  for (const key of known) {
    if (EXEMPT_KEYS.has(key)) continue;
    const d = depth.get(key);
    if (d === undefined) failures.push(`Недостижима от главной: ${key}`);
    else if (d > MAX_DEPTH) failures.push(`Слишком глубоко: ${key} на ${d} кликах, максимум ${MAX_DEPTH}`);
  }

  const stats = {
    pages: known.size,
    maxDepth: Math.max(...[...depth.values()]),
    weakest: [...inbound.entries()].filter(([k]) => !EXEMPT_KEYS.has(k))
      .sort((a, b) => a[1].size - b[1].size).slice(0, 5)
      .map(([k, v]) => `${k} (${v.size})`),
  };

  return { name, failures, stats };
}
