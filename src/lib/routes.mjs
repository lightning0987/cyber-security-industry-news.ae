/**
 * Единственный источник истины по URL сайта.
 *
 * Все ссылки строятся отсюда. Если URL меняется, он меняется в одном месте, и
 * гард битых ссылок ловит любое расхождение на сборке.
 */

export const ROUTES = {
  home: () => '/',
  tracker: () => '/uae-ransomware-tracker/',
  sector: (slug) => `/uae-ransomware-tracker/${slug}/`,
  period: (slug) => `/uae-ransomware-tracker/${slug}/`,
  groupsHub: () => '/ransomware-groups-targeting-uae/',
  guides: () => '/guides/',
  news: () => '/news/',
  /**
   * Материалы лежат ПОД разделом, а не в корне.
   *
   * Плоский /<slug>/ ставит статью в один ряд с /about/ и /contact/: раздел
   * не виден ни в отчёте по страницам, ни краулеру, и сегментировать трафик
   * по нему нельзя. Рубрика в путь не берётся намеренно: рубрику материала
   * можно поменять, а URL меняться при этом не должен.
   */
  article: (slug) => `/news/${slug}/`,
  category: (slug) => `/news/category/${slug}/`,
  archive: (year, month) => `/news/archive/${year}/${month}/`,
  guide: (slug) => `/guides/${slug}/`,
  group: (slug) => `/ransomware-groups-targeting-uae/${slug}/`,
  about: () => '/about/',
  methodology: () => '/methodology/',
  editorialPolicy: () => '/editorial-policy/',
  dataSources: () => '/data-sources/',
  sitemap: () => '/sitemap/',
  contact: () => '/contact/',
  credits: () => '/credits/',
};

/**
 * Периоды (годы) с отдельными страницами.
 *
 * Пять, а не семь: в 2020 и 2021 по две записи, в 2022 — пять. Три страницы на
 * девять записей прошли бы проверку уникальности Title и всё равно читались бы
 * как дорвеи, поэтому ранние годы схлопнуты в одну архивную страницу.
 */
export const PERIODS = [
  { slug: '2020-2022', label: '2020–2022', from: 2020, to: 2022, archive: true },
  { slug: '2023', label: '2023', from: 2023, to: 2023, archive: false },
  { slug: '2024', label: '2024', from: 2024, to: 2024, archive: false },
  { slug: '2025', label: '2025', from: 2025, to: 2025, archive: false },
  { slug: '2026', label: '2026', from: 2026, to: 2026, archive: false },
];

export function periodBySlug(slug) {
  return PERIODS.find((p) => p.slug === slug) ?? null;
}

export function periodForYear(year) {
  return PERIODS.find((p) => year >= p.from && year <= p.to) ?? null;
}
