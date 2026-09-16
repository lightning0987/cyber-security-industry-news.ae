/**
 * HTTP-клиент для лоадеров.
 *
 * Существует по одной причине: api.ransomware.live примерно в половине случаев
 * отдаёт HTML-страницу 404 вместо JSON, без всякой ошибки авторизации и без
 * какой-либо закономерности. Проверено 16.09.2026: шесть запросов подряд дали
 * 404, 200, 404, 404, 200, 404. Наивный fetch здесь не работает.
 *
 * Поэтому клиент обязан проверять не только статус, но и content-type: HTTP 200
 * с `text/html` — это тоже отказ, просто замаскированный.
 */

const DEFAULT_RETRIES = 6;
const DEFAULT_BASE_DELAY_MS = 2_000;
const DEFAULT_TIMEOUT_MS = 45_000;

const USER_AGENT =
  'MarsadCyber/1.0 (+independent threat-data research; contact via site)';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class FetchFailedError extends Error {
  constructor(message, { url, attempts }) {
    super(message);
    this.name = 'FetchFailedError';
    this.url = url;
    this.attempts = attempts;
  }
}

/**
 * Тянет JSON с ретраями и экспоненциальным бэкоффом.
 *
 * Успехом считается только ответ, который: вернул 2xx, объявил JSON в
 * content-type И успешно распарсился. Любое другое сочетание — попытка
 * потрачена впустую, идём на следующую.
 *
 * @returns {Promise<{data: unknown, url: string, attempts: number}>}
 */
export async function fetchJson(url, options = {}) {
  const {
    retries = DEFAULT_RETRIES,
    baseDelayMs = DEFAULT_BASE_DELAY_MS,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    headers = {},
    accept = 'application/json',
  } = options;

  const problems = [];

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: accept, ...headers },
        signal: controller.signal,
        redirect: 'follow',
      });

      const contentType = response.headers.get('content-type') ?? '';

      if (!response.ok) {
        problems.push(`попытка ${attempt}: HTTP ${response.status}`);
      } else if (!contentType.includes('json') && !contentType.includes('xml')) {
        // Замаскированный отказ: 200 с HTML-телом.
        problems.push(`попытка ${attempt}: HTTP 200, но content-type ${contentType}`);
      } else {
        const text = await response.text();
        try {
          const data = accept.includes('json') ? JSON.parse(text) : text;
          return { data, url, attempts: attempt };
        } catch (parseError) {
          problems.push(`попытка ${attempt}: тело не парсится (${parseError.message})`);
        }
      }
    } catch (error) {
      const reason = error.name === 'AbortError' ? `таймаут ${timeoutMs}ms` : error.message;
      problems.push(`попытка ${attempt}: ${reason}`);
    } finally {
      clearTimeout(timer);
    }

    if (attempt < retries) {
      // Экспоненциальный бэкофф с джиттером: 2s, 4s, 8s, 16s, 32s.
      const delay = baseDelayMs * 2 ** (attempt - 1) + Math.random() * 1_000;
      console.warn(`  ↻ ${problems.at(-1)}, повтор через ${Math.round(delay / 1000)}s`);
      await sleep(delay);
    }
  }

  throw new FetchFailedError(
    `Не удалось получить JSON с ${url} за ${retries} попыток:\n  ${problems.join('\n  ')}`,
    { url, attempts: retries },
  );
}

/** То же, но для XML (новостные sitemap). Возвращает сырой текст. */
export async function fetchText(url, options = {}) {
  return fetchJson(url, { ...options, accept: 'application/xml, text/xml' });
}
