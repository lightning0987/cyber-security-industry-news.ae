/**
 * Построение мета-тегов и разметки.
 *
 * Правила из раздела 13 ТЗ: ключ в точном вхождении внутри первых 60 символов
 * Title, число как можно ближе к началу, Description до 158 символов с числом и
 * периодом в первом предложении. Ни эмодзи, ни завлекательных прилагательных:
 * аудитория — CISO и security-инженеры, для них кликабельность создают число,
 * дата и имя сущности, а эмодзи в сниппете читается как мусорный ресурс.
 *
 * Все Title и Description уникальны по сайту. Это проверяет гард unique-meta,
 * и проверка блокирующая: при полусотне программных страниц шаблон с
 * непроставленной переменной наплодит одинаковые заголовки незаметно для глаза.
 */

export const BRAND = 'Marsad Cyber';
export const AUTHOR = 'Marsad Research Team';

const MAX_TITLE = 65;
const MAX_DESCRIPTION = 158;

/** Обрезает по границе слова, без многоточия-обрубка посреди слова. */
function clamp(text, max) {
  const t = String(text).replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, t.lastIndexOf(' ', max - 1))}`.replace(/[,;:.\s]+$/, '');
}

export function buildTitle(text) {
  return clamp(text, MAX_TITLE);
}

export function buildDescription(text) {
  return clamp(text, MAX_DESCRIPTION);
}

/** Дата снапшота в человеческом виде для «Data as of». */
export function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });
}

/** Дата для прозы: «2 May 2024». ISO остаётся в атрибуте datetime. */
export function formatDayLong(iso) {
  if (!iso) return null;
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });
}

export function formatDateShort(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC',
  });
}

/** Organization — привязана к бренду сайта, не к клиенту и не к агентству. */
export function organizationSchema(site) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: BRAND,
    url: site,
    description: 'Independent threat-data research project tracking ransomware and exploited vulnerabilities affecting organisations in the United Arab Emirates.',
    areaServed: { '@type': 'Country', name: 'AE' },
  };
}

/** Dataset — на страницах трекера. */
export function datasetSchema({ site, url, name, description, fetchedAt, from, to }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name,
    description,
    url: new URL(url, site).href,
    creator: { '@type': 'Organization', name: BRAND },
    spatialCoverage: { '@type': 'Country', name: 'AE' },
    temporalCoverage: `${from}/${to}`,
    dateModified: fetchedAt,
    isAccessibleForFree: true,
    license: 'https://creativecommons.org/licenses/by/4.0/',
  };
}

export function breadcrumbSchema(site, crumbs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.label,
      item: new URL(c.href, site).href,
    })),
  };
}

export { MAX_TITLE, MAX_DESCRIPTION };
