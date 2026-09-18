/**
 * Какие регуляторные рамки уместно упоминать для каждого сектора.
 *
 * ОСТОРОЖНО. Список намеренно узкий. ADHICS (здравоохранение Абу-Даби) и CBUAE
 * (банки) в контент не берутся: по разделу 0.2 ТЗ они требуют отдельной проверки,
 * попадаем ли мы туда по профилю. Пока проверки нет — не упоминаем.
 *
 * И общее правило формулировок: объясняем, что рамка требует, и никогда не
 * заявляем аккредитацию, сертификацию или оценку соответствия.
 */

export const FRAMEWORKS = {
  'desc-isr': {
    name: 'DESC ISR v3',
    full: 'Dubai Information Security Regulation, version 3 (2023)',
    facts: ['13 control domains', 'methodologically aligned with ISO 27001 and NIST CSF'],
    scope: 'Dubai government entities, semi-government organisations, cloud providers serving Dubai government, and key suppliers handling government data',
  },
  'uae-ias': {
    name: 'UAE IAS v2',
    full: 'UAE Information Assurance Standard, version 2 (2025)',
    facts: ['188 controls', '60 management and 128 technical', '39 Priority One controls mandatory for everything in scope'],
    scope: 'Critical national infrastructure operators and government entities across all emirates',
  },
  'uae-pdpl': {
    name: 'UAE PDPL',
    full: 'UAE Personal Data Protection Law',
    facts: ['federal scope', 'breach notification duties'],
    scope: 'Any organisation processing personal data of individuals in the UAE',
  },
  'dfsa-trm': {
    name: 'DFSA TRM',
    full: 'DFSA Technology and Risk Management rules',
    facts: ['applies inside the DIFC free zone'],
    scope: 'Firms authorised in the Dubai International Financial Centre',
  },
};

/** Сектор → релевантные рамки, от самой профильной к общей. */
const BY_SECTOR = {
  'government-defense': ['desc-isr', 'uae-ias', 'uae-pdpl'],
  'energy-utilities': ['uae-ias', 'desc-isr', 'uae-pdpl'],
  'transportation': ['uae-ias', 'desc-isr', 'uae-pdpl'],
  'technology': ['desc-isr', 'uae-pdpl'],
  'financial-services': ['dfsa-trm', 'uae-pdpl'],
  'professional-services': ['uae-pdpl', 'desc-isr'],
  'healthcare': ['uae-pdpl'],
  'education': ['uae-pdpl'],
  'manufacturing': ['uae-pdpl'],
  'retail-ecommerce': ['uae-pdpl'],
  'hospitality': ['uae-pdpl'],
  'agriculture-food': ['uae-pdpl'],
  'other': ['uae-pdpl'],
};

/** Рамка → секторы, которые чаще всего попадают в её периметр. Обратный индекс BY_SECTOR. */
export function sectorsForFramework(key) {
  return Object.entries(BY_SECTOR)
    .filter(([, keys]) => keys.includes(key))
    .map(([slug]) => slug);
}

export function frameworksForSector(slug) {
  return (BY_SECTOR[slug] ?? ['uae-pdpl']).map((k) => FRAMEWORKS[k]);
}

/** Секторы, по которым рамки сознательно не называем. */
export const EXCLUDED_NOTE =
  'ADHICS (Abu Dhabi healthcare) and CBUAE (banking) are deliberately not referenced anywhere on this site pending a scope review. Do not mention them.';
