/**
 * Дубликация между шаблонным вводным абзацем и редакционным блоком.
 *
 * ЗАЧЕМ. Вводный абзац страницы уже называет количество, долю, лидера и даты.
 * Если редакционный текст открывается тем же самым, страница тратит самую
 * заметную позицию блока на повтор, а сайт получает ровно ту тонкую
 * дублирующуюся прозу, против которой он и построен.
 *
 * Поймать это в линтере markdown нельзя: вводный абзац собирается шаблоном и в
 * файле контента его нет. Поэтому проверка живёт здесь, на собранной странице.
 *
 * Меряем долей общих шести-словных фрагментов. Обороты вокруг дат совпадают
 * неизбежно, поэтому порог не нулевой.
 */

export const name = 'content-overlap';

const SHINGLE = 6;
const MAX_OVERLAP = 0.3;

function shingles(text) {
  const words = text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/);
  const out = new Set();
  for (let i = 0; i + SHINGLE <= words.length; i += 1) {
    out.add(words.slice(i, i + SHINGLE).join(' '));
  }
  return out;
}

export function run({ pages }) {
  const failures = [];

  for (const { path, doc } of pages) {
    const lede = doc.querySelector('p.lede');
    const context = doc.querySelector('.page-context');
    if (!lede || !context) continue;

    const a = shingles(lede.textContent ?? '');
    const b = shingles(context.textContent ?? '');
    if (a.size === 0) continue;

    let shared = 0;
    for (const s of a) if (b.has(s)) shared += 1;
    const ratio = shared / a.size;

    if (ratio > MAX_OVERLAP) {
      failures.push(
        `${path}: редакционный блок повторяет ${Math.round(ratio * 100)}% вводного абзаца ` +
        `(порог ${MAX_OVERLAP * 100}%). Он должен добавлять, а не пересказывать.`,
      );
    }
  }

  return { name, failures };
}
