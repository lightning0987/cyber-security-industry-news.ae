/**
 * Связи между страницами, выведенные из данных.
 *
 * Ключевой принцип раздела 14.1 ТЗ: связи генерируются из данных, а не
 * проставляются руками. Если группа била по сектору, ссылка между их
 * страницами появляется сама.
 *
 * ОТКЛОНЕНИЕ ОТ ТЗ 14.2, оговорённое сознательно. Блок «Popular» ТЗ предлагает
 * считать по числу входящих внутренних ссылок. На сайте из сорока страниц,
 * где подвал и ряды сиблингов ссылаются почти на всё, это число выходит
 * практически одинаковым и ранжирует случайно. Вместо фальшивого рейтинга
 * блок ранжируется по активности и называется тем, чем является.
 */

import { attributedIncidents } from './incidents.mjs';
import { bySector, byPeriod, byGroup, groupsWithPages, inSector, inPeriod, inGroup } from './aggregate.mjs';
import { ROUTES, PERIODS } from './routes.mjs';
import { sectorPhoto } from './images.mjs';

const inc = attributedIncidents;
const SECTORS = bySector(inc);
const PERIOD_ROWS = byPeriod(inc);
const GROUPS = byGroup(inc);
const PAGED = groupsWithPages(inc);
const pagedSet = new Set(PAGED.map((g) => g.slug));

const sectorCard = (s) => ({
  href: ROUTES.sector(s.slug), title: s.label, figure: s.count, figureLabel: 'claims',
  meta: 'Sector', kind: 'sector', slug: s.slug,
  thumb: sectorPhoto(s.slug)?.thumb ?? null,
  thumbAlt: sectorPhoto(s.slug)?.alt ?? null,
});
const periodCard = (p) => ({
  href: ROUTES.period(p.slug), title: p.label, figure: p.count, figureLabel: 'claims',
  meta: 'Period', kind: 'period', slug: p.slug,
});
const groupCard = (g) => ({
  href: ROUTES.group(g.slug), title: g.label, figure: g.count, figureLabel: 'claims',
  meta: 'Ransomware group', kind: 'group', slug: g.slug,
});

/** Самая свежая дата заявления в наборе. */
function latestDate(records) {
  return records.map((r) => r.discovered).filter(Boolean).sort().at(-1) ?? '';
}

/**
 * Связанные страницы: те, что делят сущность с текущей.
 * Ранжирование по числу общих инцидентов, при равенстве — свежее вперёд.
 */
export function relatedTo({ kind, slug }, limit = 6) {
  const out = [];

  if (kind === 'sector') {
    const subset = inSector(inc, slug);
    // Группы, бившие по этому сектору.
    for (const g of byGroup(subset)) {
      if (pagedSet.has(g.slug)) {
        out.push({ ...groupCard(GROUPS.find((x) => x.slug === g.slug)), overlap: g.count,
          recency: latestDate(inGroup(inc, g.slug)) });
      }
    }
    // Периоды, в которые сектор был активен.
    for (const p of PERIOD_ROWS) {
      const n = subset.filter((i) => i.year >= p.from && i.year <= p.to).length;
      if (n > 0) out.push({ ...periodCard(p), overlap: n, recency: '' });
    }
  }

  if (kind === 'group') {
    const subset = inGroup(inc, slug);
    for (const s of SECTORS) {
      const n = subset.filter((i) => i.sector === s.slug).length;
      if (n > 0) out.push({ ...sectorCard(s), overlap: n, recency: latestDate(inSector(inc, s.slug)) });
    }
    for (const p of PERIOD_ROWS) {
      const n = subset.filter((i) => i.year >= p.from && i.year <= p.to).length;
      if (n > 0) out.push({ ...periodCard(p), overlap: n, recency: '' });
    }
  }

  if (kind === 'period') {
    const period = PERIODS.find((p) => p.slug === slug);
    const subset = period ? inPeriod(inc, period) : [];
    for (const s of SECTORS) {
      const n = subset.filter((i) => i.sector === s.slug).length;
      if (n > 0) out.push({ ...sectorCard(s), overlap: n, recency: latestDate(inSector(inc, s.slug)) });
    }
    for (const g of byGroup(subset)) {
      if (pagedSet.has(g.slug)) {
        out.push({ ...groupCard(GROUPS.find((x) => x.slug === g.slug)), overlap: g.count,
          recency: latestDate(inGroup(inc, g.slug)) });
      }
    }
  }

  return out
    .sort((a, b) => b.overlap - a.overlap || b.recency.localeCompare(a.recency))
    .slice(0, limit);
}

/** Соседи того же типа. Аналог «More from [рубрика]». */
export function moreOfKind({ kind, slug }, limit = 5) {
  if (kind === 'sector') return SECTORS.filter((s) => s.slug !== slug).slice(0, limit).map(sectorCard);
  if (kind === 'period') return PERIOD_ROWS.filter((p) => p.slug !== slug).slice(0, limit).map(periodCard);
  return PAGED.filter((g) => g.slug !== slug).slice(0, limit).map(groupCard);
}

/** Самые активные страницы сайта. Честная замена блоку «Popular», см. шапку файла. */
export function mostActive(limit = 5) {
  return [...SECTORS.slice(0, 3).map(sectorCard), ...PAGED.slice(0, 3).map(groupCard)]
    .sort((a, b) => b.figure - a.figure)
    .slice(0, limit);
}

/** Три сущности с самыми свежими заявлениями. Аналог «Latest from the tracker». */
export function latestActivity(limit = 3) {
  return PAGED
    .map((g) => ({ ...groupCard(g), recency: latestDate(inGroup(inc, g.slug)) }))
    .sort((a, b) => b.recency.localeCompare(a.recency))
    .slice(0, limit);
}

/** Один ближайший по сущностям материал. Врезка внутри текста. */
export function alsoRead(current) {
  return relatedTo(current, 1)[0] ?? null;
}

export { SECTORS, PERIOD_ROWS, PAGED, GROUPS };
