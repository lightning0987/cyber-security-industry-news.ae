/**
 * Ленты новостей.
 *
 * Тридцать с лишним источников, а не пять, по той же причине, что и у коллег:
 * на пяти лентах в отдельные дни не окажется ни одной истории, которая
 * выдержит наш отбор, и конвейер начнёт публиковать что попало, лишь бы
 * выполнить норму.
 *
 * `weight` влияет только на порядок разбора при равном числе источников у
 * истории. Это не оценка издания: вес выше у тех, кто пишет первичный разбор,
 * а не пересказ.
 */

export const FEEDS = [
  // ── Отраслевые издания ────────────────────────────────────────
  { id: 'bleepingcomputer', url: 'https://www.bleepingcomputer.com/feed/', weight: 3 },
  { id: 'therecord', url: 'https://therecord.media/feed', weight: 3 },
  { id: 'securityweek', url: 'https://www.securityweek.com/feed/', weight: 2 },
  { id: 'darkreading', url: 'https://www.darkreading.com/rss.xml', weight: 2 },
  { id: 'thehackernews', url: 'https://feeds.feedburner.com/TheHackersNews', weight: 2 },
  { id: 'krebs', url: 'https://krebsonsecurity.com/feed/', weight: 3 },
  { id: 'infosecurity', url: 'https://www.infosecurity-magazine.com/rss/news/', weight: 2 },
  { id: 'cyberscoop', url: 'https://cyberscoop.com/feed/', weight: 2 },
  { id: 'helpnetsecurity', url: 'https://www.helpnetsecurity.com/feed/', weight: 1 },
  { id: 'arstechnica-sec', url: 'https://arstechnica.com/security/feed/', weight: 2 },
  { id: 'theregister-sec', url: 'https://www.theregister.com/security/headlines.atom', weight: 2 },
  { id: 'schneier', url: 'https://www.schneier.com/feed/', weight: 2 },

  // ── Исследовательские блоги вендоров: первичный разбор ────────
  { id: 'sophos', url: 'https://feeds.feedburner.com/sophos/dgdY', weight: 3 },
  { id: 'unit42', url: 'https://unit42.paloaltonetworks.com/feed/', weight: 3 },
  { id: 'talos', url: 'https://blog.talosintelligence.com/rss/', weight: 3 },
  { id: 'microsoft-sec', url: 'https://www.microsoft.com/en-us/security/blog/feed/', weight: 3 },
  { id: 'sentinelone', url: 'https://www.sentinelone.com/blog/feed/', weight: 2 },
  { id: 'recordedfuture', url: 'https://www.recordedfuture.com/feed', weight: 2 },
  { id: 'checkpoint', url: 'https://research.checkpoint.com/feed/', weight: 2 },
  { id: 'proofpoint', url: 'https://www.proofpoint.com/us/rss.xml', weight: 2 },
  { id: 'bitdefender', url: 'https://www.bitdefender.com/blog/api/rss/labs/', weight: 2 },
  { id: 'rapid7', url: 'https://blog.rapid7.com/rss/', weight: 2 },
  { id: 'welivesecurity', url: 'https://www.welivesecurity.com/en/rss/feed/', weight: 2 },
  { id: 'securelist', url: 'https://securelist.com/feed/', weight: 2 },

  // ── Регуляторы и CERT ─────────────────────────────────────────
  { id: 'cisa-advisories', url: 'https://www.cisa.gov/cybersecurity-advisories/all.xml', weight: 3 },
  { id: 'ncsc-uk', url: 'https://www.ncsc.gov.uk/api/1/services/v1/news-rss-feed.xml', weight: 2 },

  // ── Регион. Через Google News: прямых лент у большинства нет ──
  { id: 'gn-uae-cyber', url: 'https://news.google.com/rss/search?q=UAE+cybersecurity&hl=en&gl=AE&ceid=AE:en', weight: 1 },
  { id: 'gn-dubai-breach', url: 'https://news.google.com/rss/search?q=Dubai+data+breach&hl=en&gl=AE&ceid=AE:en', weight: 1 },
  { id: 'gn-gulf-ransomware', url: 'https://news.google.com/rss/search?q=ransomware+Gulf+OR+Emirates&hl=en&gl=AE&ceid=AE:en', weight: 1 },
  { id: 'gn-uae-regulator', url: 'https://news.google.com/rss/search?q=TDRA+OR+%22Cyber+Security+Council%22+UAE&hl=en&gl=AE&ceid=AE:en', weight: 1 },
];

/**
 * Темы, которые не публикуются ни при каких условиях.
 *
 * Политика и война исключены по той же причине, что у коллег: сайт про
 * безопасность бизнеса, и один материал не по теме стоит дороже, чем
 * пропущенный день.
 */
export const BANNED_TOPICS =
  /\b(election|war in|airstrike|missile|troops|sanctions against|parliament|president|minister of defen[cs]e|gaza|ukraine war|israeli strike)\b/i;

/** История обязана быть про безопасность, а не про рынок или релиз продукта. */
export const SECURITY_SIGNAL =
  /\b(breach|hack|hacked|ransomware|malware|vulnerabilit|exploit|zero[- ]day|phishing|data leak|leaked|compromise|backdoor|threat actor|cyber ?attack|infostealer|botnet|CVE-\d{4}-\d+)\b/i;
