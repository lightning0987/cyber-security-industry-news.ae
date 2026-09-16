/**
 * Уникальность и качество мета-тегов.
 *
 * Уникальность блокирующая не случайно: при полусотне программных страниц
 * шаблон с непроставленной переменной наплодит сотню одинаковых Title, и глазом
 * это не заметно.
 */

export const name = 'unique-meta';

const STOP_PHRASES = [
  'everything you need to know', 'what you need to know', 'ultimate guide',
  'complete guide', "you won't believe", 'comprehensive approach', 'holistic',
  'synergy', 'industry-leading', 'we guarantee', 'cutting-edge',
];

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u;

export function run({ pages }) {
  const failures = [];
  const titles = new Map();
  const descriptions = new Map();

  for (const { path, doc } of pages) {
    const title = doc.querySelector('title')?.textContent?.trim() ?? '';
    const desc = doc.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() ?? '';
    const canonical = doc.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? '';
    const h1s = doc.querySelectorAll('h1');

    if (!title) failures.push(`${path}: нет <title>`);
    if (!desc) failures.push(`${path}: нет meta description`);
    if (!canonical) failures.push(`${path}: нет canonical`);

    if (title.length > 65) failures.push(`${path}: Title ${title.length} символов, максимум 65 — "${title}"`);
    if (desc && (desc.length < 80 || desc.length > 158)) {
      failures.push(`${path}: Description ${desc.length} символов, нужно 80–158`);
    }

    if (h1s.length !== 1) failures.push(`${path}: H1 должен быть ровно один, найдено ${h1s.length}`);
    const h1 = h1s[0]?.textContent?.trim() ?? '';
    if (h1 && h1 === title) failures.push(`${path}: H1 дословно совпадает с Title`);

    if (EMOJI.test(title) || EMOJI.test(desc)) failures.push(`${path}: эмодзи в мета-тегах`);

    for (const phrase of STOP_PHRASES) {
      if (title.toLowerCase().includes(phrase) || desc.toLowerCase().includes(phrase)) {
        failures.push(`${path}: стоп-фраза "${phrase}" в мета-тегах`);
      }
    }

    // Canonical должен быть самореферентным. Кроме noindex-страниц: 404 отдаётся
    // сервером, а не навигацией, в индекс не идёт, и её canonical ни на что не влияет.
    const isNoindex = (doc.querySelector('meta[name="robots"]')?.getAttribute('content') ?? '').includes('noindex');
    if (canonical && !isNoindex) {
      const canonPath = new URL(canonical).pathname;
      // index.html → директория, прочие .html (404) → собственный путь.
      const expected = path.endsWith('index.html')
        ? `/${path.slice(0, -'index.html'.length)}`.replace(/\/+/g, '/')
        : `/${path}`;
      if (canonPath !== expected) {
        failures.push(`${path}: canonical не самореферентный (${canonPath} вместо ${expected})`);
      }
    }

    if (title) (titles.get(title) ?? titles.set(title, []).get(title)).push(path);
    if (desc) (descriptions.get(desc) ?? descriptions.set(desc, []).get(desc)).push(path);
  }

  for (const [title, paths] of titles) {
    if (paths.length > 1) failures.push(`Дублирующийся Title на ${paths.length} страницах: "${title}" — ${paths.join(', ')}`);
  }
  for (const [desc, paths] of descriptions) {
    if (paths.length > 1) failures.push(`Дублирующийся Description на ${paths.length} страницах — ${paths.join(', ')}`);
  }

  return { name, failures };
}
