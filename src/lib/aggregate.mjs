/**
 * Чистые синхронные агрегации над массивом записей.
 *
 * Здесь живёт вся аналитика сайта: разбивки по сектору, периоду и группе плюс
 * кросс-связи между ними. Функции чистые и синхронные намеренно — их легко
 * проверить и невозможно случайно сделать асинхронными через слой данных.
 */

import { allSectors } from './taxonomy/sectors.mjs';
import { displayGroupName, MIN_INCIDENTS_FOR_PAGE } from './taxonomy/groups.mjs';
import { PERIODS, periodForYear } from './routes.mjs';

const desc = (a, b) => b.count - a.count || a.label.localeCompare(b.label);

/** Разбивка по секторам. Возвращает все 13 секторов, включая нулевые. */
export function bySector(incidents) {
  const counts = new Map();
  for (const i of incidents) {
    if (i.sector) counts.set(i.sector, (counts.get(i.sector) ?? 0) + 1);
  }
  return allSectors()
    .map(({ slug, label }) => ({ slug, label, count: counts.get(slug) ?? 0 }))
    .sort(desc);
}

/** Разбивка по периодам в хронологическом порядке (для графика динамики). */
export function byPeriod(incidents) {
  return PERIODS.map((p) => ({
    ...p,
    count: incidents.filter((i) => i.year !== null && i.year >= p.from && i.year <= p.to).length,
  }));
}

/** Разбивка по месяцам внутри набора. Для спарклайнов и таблиц динамики. */
export function byMonth(incidents) {
  const counts = new Map();
  for (const i of incidents) {
    if (i.month) counts.set(i.month, (counts.get(i.month) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

/** Разбивка по группам, от активных к редким. */
export function byGroup(incidents) {
  const counts = new Map();
  for (const i of incidents) {
    const cur = counts.get(i.group_slug) ?? { slug: i.group_slug, raw: i.group, count: 0 };
    cur.count += 1;
    counts.set(i.group_slug, cur);
  }
  return [...counts.values()]
    .map((g) => ({ ...g, label: displayGroupName(g.raw) }))
    .sort(desc);
}

/** Группы, заслуживающие собственной страницы (порог из taxonomy/groups.mjs). */
export function groupsWithPages(incidents) {
  return byGroup(incidents).filter((g) => g.count >= MIN_INCIDENTS_FOR_PAGE);
}

/** Группы, которые перечисляются только на хабе, без своего URL. */
export function groupsWithoutPages(incidents) {
  return byGroup(incidents).filter((g) => g.count < MIN_INCIDENTS_FOR_PAGE);
}

/** Разбивка по уверенности атрибуции. Показывается открыто, это вопрос доверия. */
export function byConfidence(incidents) {
  const out = { confirmed: 0, probable: 0, unverified: 0 };
  for (const i of incidents) out[i.ae_confidence] += 1;
  return out;
}

/** Инциденты одного сектора. */
export function inSector(incidents, slug) {
  return incidents.filter((i) => i.sector === slug);
}

/** Инциденты одного периода. */
export function inPeriod(incidents, period) {
  return incidents.filter((i) => i.year !== null && i.year >= period.from && i.year <= period.to);
}

/** Инциденты одной группы. */
export function inGroup(incidents, slug) {
  return incidents.filter((i) => i.group_slug === slug);
}

/**
 * Периоды активности группы — для связок и для фразы «с такого-то по такой-то».
 */
export function activitySpan(incidents) {
  const dates = incidents.map((i) => i.discovered).filter(Boolean).sort();
  if (dates.length === 0) return { first: null, last: null, periods: [] };
  const years = [...new Set(incidents.map((i) => i.year).filter(Boolean))];
  return {
    first: dates[0],
    last: dates.at(-1),
    periods: [...new Set(years.map((y) => periodForYear(y)?.slug).filter(Boolean))],
  };
}

/** Топ-N с сохранением формы элементов. */
export function top(list, n) {
  return list.filter((x) => x.count > 0).slice(0, n);
}
