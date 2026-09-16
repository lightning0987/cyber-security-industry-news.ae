// @ts-check
import { defineConfig } from 'astro/config';

// Боевой домен ещё не зарегистрирован. `site` берётся из окружения, чтобы
// canonical и sitemap собрались под прод без правки шаблонов.
// Локально это http://localhost:4321, в CI — SITE_URL из переменных Cloudflare.
const SITE = process.env.SITE_URL ?? 'http://localhost:4321';

export default defineConfig({
  site: SITE,
  output: 'static',
  trailingSlash: 'always',
  build: {
    // Каждая страница — собственная директория с index.html.
    // Нужно для чистых URL вида /uae-ransomware-tracker/technology/
    format: 'directory',
  },
  // Ноль клиентских фреймворков. Никаких интеграций, требующих рантайма.
  integrations: [],
});
