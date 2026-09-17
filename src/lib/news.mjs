/**
 * Рубрики новостей.
 *
 * Пустых рубрик не создаём: страница рубрики без материалов — это тонкая
 * страница, которую гард связности пропустит, а читатель и краулер прочтут как
 * заготовку. Рубрика появляется вместе с первым материалом в ней.
 */
export const CATEGORIES = {
  ransomware: {
    label: 'Ransomware',
    blurb: 'Claims published by ransomware groups against organisations in the United Arab Emirates.',
  },
  'threat-intel': {
    label: 'Threat Intel',
    blurb: 'Patterns across the UAE ransomware record: sector shifts, group turnover and what the data does not show.',
  },
  regulation: {
    label: 'Regulation',
    blurb: 'How UAE security and data protection rules reach organisations, and what they require in evidence.',
  },
  vulnerabilities: {
    label: 'Vulnerabilities',
    blurb: 'Exploited vulnerabilities relevant to organisations operating in the United Arab Emirates.',
  },
};

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function categoryOf(slug) {
  return CATEGORIES[slug] ?? null;
}

/** Материалы, отсортированные от свежих к старым. */
export function sortNews(entries) {
  return [...entries].sort((a, b) => b.data.published.localeCompare(a.data.published));
}

/** Карточка материала для блоков рециркуляции. */
import { photo } from './images.mjs';

export function newsCard(entry) {
  const p = photo(entry.data.image);
  return {
    thumb: p?.thumb ?? null,
    thumbAlt: p?.alt ?? null,
    href: `/${entry.id}/`,
    title: entry.data.h1,
    figure: entry.data.published.slice(8, 10),
    meta: `${CATEGORIES[entry.data.category].label} · ${entry.data.published}`,
    category: entry.data.category,
    published: entry.data.published,
  };
}

/** Материалы, делящие сущности с текущим. Связи из данных, а не вручную. */
export function relatedNews(entry, all, limit = 5) {
  const e = entry.data.entities;
  const score = (other) => {
    const o = other.data.entities;
    const overlap = (a, b) => a.filter((x) => b.includes(x)).length;
    return overlap(e.sectors, o.sectors) + overlap(e.groups, o.groups) + overlap(e.periods, o.periods)
      + (other.data.category === entry.data.category ? 1 : 0);
  };
  return sortNews(all.filter((x) => x.id !== entry.id))
    .map((x) => ({ entry: x, s: score(x) }))
    .sort((a, b) => b.s - a.s || b.entry.data.published.localeCompare(a.entry.data.published))
    .slice(0, limit)
    .map((x) => newsCard(x.entry));
}
