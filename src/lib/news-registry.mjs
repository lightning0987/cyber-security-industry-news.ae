/**
 * Рубрики, в которых есть материалы. Нужен синхронно для nav.mjs.
 * check-data следит, чтобы реестр не разошёлся с реальными материалами:
 * рубрика без материалов даёт пустую страницу, рубрика без записи здесь —
 * страницу без входящих ссылок.
 */
export const NEWS_CATEGORIES = [
  { slug: 'ransomware', label: 'Ransomware' },
  { slug: 'threat-intel', label: 'Threat Intel' },
  { slug: 'regulation', label: 'Regulation' },
];
