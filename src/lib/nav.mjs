/**
 * Навигация как данные.
 *
 * Подвал по ТЗ 14.7 должен нести 35–45 ссылок в пяти колонках. Но ссылаться он
 * имеет право только на существующие страницы: битая внутренняя ссылка роняет
 * гард link-graph, и правильно делает. Поэтому колонки собираются из реальных
 * секторов, периодов и групп, а разделы будущих спринтов появятся здесь тогда,
 * когда появятся сами страницы.
 */

import { ROUTES, PERIODS } from './routes.mjs';
import { GUIDES } from './guides.mjs';
import { attributedIncidents } from './incidents.mjs';
import { bySector, groupsWithPages } from './aggregate.mjs';

const sectors = bySector(attributedIncidents);
const groups = groupsWithPages(attributedIncidents);

/** Шапка. Пункты ведут только туда, где есть содержание. */
export const HEADER_NAV = [
  { label: 'Ransomware Tracker', href: ROUTES.tracker() },
  { label: 'Groups', href: ROUTES.groupsHub() },
  { label: 'Guides', href: ROUTES.guides() },
  { label: 'Methodology', href: ROUTES.methodology() },
  { label: 'About', href: ROUTES.about() },
];

/** Лента чипов под шапкой: секторы как постоянные точки входа. */
export const CHIP_RAIL = sectors.map((s) => ({ label: s.label, href: ROUTES.sector(s.slug) }));

/**
 * Колонки подвала. Заголовок колонки — сам по себе ссылка.
 * Счётчик ссылок проверяется гардом: 35–45.
 */
export const FOOTER_COLUMNS = [
  {
    heading: { label: 'About', href: ROUTES.about() },
    links: [
      { label: 'Methodology', href: ROUTES.methodology() },
      { label: 'Data Sources', href: ROUTES.dataSources() },
      { label: 'Editorial Policy', href: ROUTES.editorialPolicy() },
    ],
  },
  {
    heading: { label: 'Ransomware Tracker', href: ROUTES.tracker() },
    links: sectors.map((s) => ({ label: s.label, href: ROUTES.sector(s.slug) })),
  },
  {
    heading: { label: 'By Period', href: ROUTES.tracker() },
    links: PERIODS.map((p) => ({ label: p.label, href: ROUTES.period(p.slug) })),
  },
  {
    heading: { label: 'Ransomware Groups', href: ROUTES.groupsHub() },
    links: groups.slice(0, 12).map((g) => ({ label: g.label, href: ROUTES.group(g.slug) })),
  },
  {
    heading: { label: 'Guides', href: ROUTES.guides() },
    links: GUIDES.map((g) => ({ label: g.standard, href: ROUTES.guide(g.slug) })),
  },
  {
    heading: null,
    links: [
      { label: 'Sitemap', href: ROUTES.sitemap() },
      { label: 'Dataset (JSON)', href: '/data/incidents.json' },
      { label: 'Dataset (CSV)', href: '/data/incidents.csv' },
    ],
  },
];

/** Сколько всего ссылок в подвале — для самопроверки и для гарда. */
export const FOOTER_LINK_COUNT = FOOTER_COLUMNS.reduce(
  (n, c) => n + c.links.length + (c.heading ? 1 : 0),
  0,
);

/** Источники данных: внешние dofollow-ссылки на первоисточники (ТЗ 14.9). */
export const DATA_ATTRIBUTION = [
  { label: 'ransomware.live', href: 'https://www.ransomware.live/' },
  { label: 'CISA KEV', href: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog' },
  { label: 'FIRST.org EPSS', href: 'https://www.first.org/epss/' },
];
