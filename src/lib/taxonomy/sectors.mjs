/**
 * Секторы: явная карта «лейбл апстрима → слаг», а не алгоритмическая слагификация.
 *
 * ПОЧЕМУ НЕ АЛГОРИТМ. Слагификатор дал бы `retail-e-commerce` вместо
 * `retail-ecommerce`, а главное — молча создал бы новый URL в тот день, когда
 * ransomware.live переименует лейбл. Явная карта превращает такое переименование
 * в красную сборку вместо потерянной страницы.
 *
 * МУСОР НЕ ТАЩИМ. `Not Found` и `""` — это отсутствие классификации, а не
 * категория. Такие записи получают sector: null, страниц не создают и в разбивки
 * не попадают. Но из общего счётчика их не выбрасываем: иначе сумма по секторам
 * не сойдётся с record_count. На хабе они показываются отдельной строкой.
 */

/** @type {Record<string, {slug: string, label: string}>} */
const SECTOR_MAP = {
  'Professional Services': { slug: 'professional-services', label: 'Professional Services' },
  'Technology': { slug: 'technology', label: 'Technology' },
  'Retail & E-Commerce': { slug: 'retail-ecommerce', label: 'Retail and E-Commerce' },
  'Manufacturing': { slug: 'manufacturing', label: 'Manufacturing' },
  'Financial Services': { slug: 'financial-services', label: 'Financial Services' },
  'Government & Defense': { slug: 'government-defense', label: 'Government and Defense' },
  'Transportation': { slug: 'transportation', label: 'Transportation' },
  'Healthcare': { slug: 'healthcare', label: 'Healthcare' },
  'Hospitality': { slug: 'hospitality', label: 'Hospitality' },
  'Energy & Utilities': { slug: 'energy-utilities', label: 'Energy and Utilities' },
  'Education': { slug: 'education', label: 'Education' },
  'Agriculture and Food Production': { slug: 'agriculture-food', label: 'Agriculture and Food Production' },
  'Other': { slug: 'other', label: 'Other' },
};

/** Лейблы, означающие «апстрим не классифицировал». Страницы не получают. */
const UNCLASSIFIED_LABELS = new Set(['Not Found', '', 'Unknown', 'N/A']);

/**
 * @param {string|null|undefined} rawLabel
 * @returns {{slug: string|null, label: string|null, known: boolean}}
 *          known:false означает незнакомый лейбл — сборка обязана упасть.
 */
export function normaliseSector(rawLabel) {
  const raw = (rawLabel ?? '').trim();

  if (UNCLASSIFIED_LABELS.has(raw)) {
    return { slug: null, label: null, known: true };
  }

  const mapped = SECTOR_MAP[raw];
  if (mapped) {
    return { slug: mapped.slug, label: mapped.label, known: true };
  }

  // Незнакомый лейбл. Пишем null, но помечаем known:false, чтобы check-data
  // уронил сборку и человек дописал одну строку в карту выше.
  return { slug: null, label: null, known: false };
}

/** Все секторы, у которых есть страницы, в порядке объявления. */
export function allSectors() {
  return Object.values(SECTOR_MAP).map(({ slug, label }) => ({ slug, label }));
}

export function sectorBySlug(slug) {
  return allSectors().find((s) => s.slug === slug) ?? null;
}

export { SECTOR_MAP, UNCLASSIFIED_LABELS };
