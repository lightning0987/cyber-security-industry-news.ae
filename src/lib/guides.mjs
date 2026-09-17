/**
 * Реестр гайдов для навигации.
 *
 * Коллекция astro:content читается асинхронно, а nav.mjs синхронный и
 * импортируется в компоненты. Порядок и слаги дублируются здесь намеренно,
 * а check-data.mjs следит, чтобы реестр не разошёлся с файлами.
 */
export const GUIDES = [
  { slug: 'desc-isr-compliance-dubai', standard: 'DESC ISR v3' },
  { slug: 'uae-ias-nesa-controls', standard: 'UAE IAS v2' },
  { slug: 'uae-pdpl-breach-notification', standard: 'UAE PDPL' },
  { slug: 'difc-adgm-data-protection-comparison', standard: 'DIFC and ADGM' },
];
