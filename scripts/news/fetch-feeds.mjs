#!/usr/bin/env node
/**
 * Сбор лент. Один заход в сутки.
 *
 * Пишет в private/, а не в src/. Сырые заголовки третьих лиц — это рабочий
 * материал, а не данные сайта: сборка обязана оставаться офлайновой и
 * воспроизводимой, а лента меняется каждый час.
 *
 * Мёртвая лента здесь не ошибка. Их почти три десятка именно затем, чтобы
 * падение пяти ничего не меняло. Но счёт живых лент печатается: лента,
 * тихо отвалившаяся полгода назад, это сузившийся кругозор, о котором никто
 * не знает.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { FEEDS, BANNED_TOPICS, SECURITY_SIGNAL } from './sources.mjs';

/** Зацепка за ОАЭ и залив: поднимает историю, но не является условием. */
const REGION_HOOK =
  /\b(uae|united arab emirates|dubai|abu dhabi|sharjah|emirat|gulf|gcc|saudi|qatar|bahrain|oman|middle east|difc|adgm)\b/i;

const OUT = resolve(process.cwd(), 'private/news-feed.json');
const WINDOW_HOURS = 72;
const TIMEOUT_MS = 15000;

/** Снимает CDATA, теги и html-сущности. */
function clean(value) {
  return String(value ?? '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const tag = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? clean(m[1]) : null;
};

/**
 * Разбор RSS и Atom одним проходом.
 *
 * Без зависимости на парсер XML намеренно: нужны четыре поля из хорошо
 * сформированных лент, а каждая новая зависимость в проекте, который сам
 * себя собирает ночью, это ещё один способ сломать сборку.
 */
function parseFeed(xml) {
  const items = [];
  const blocks = xml.match(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi) ?? [];
  for (const block of blocks) {
    const title = tag(block, 'title');
    if (!title) continue;

    // Atom прячет адрес в атрибуте href, RSS кладёт его в текст.
    const link =
      tag(block, 'link') ||
      block.match(/<link[^>]*href="([^"]+)"/i)?.[1] ||
      tag(block, 'guid');
    if (!link || !/^https?:\/\//.test(link)) continue;

    const date =
      tag(block, 'pubDate') || tag(block, 'published') || tag(block, 'updated') || null;
    const summary =
      tag(block, 'description') || tag(block, 'summary') || tag(block, 'content') || '';

    items.push({ title, link, published: date, summary: summary.slice(0, 600) });
  }
  return items;
}

async function readFeed(feed) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(feed.url, {
      signal: controller.signal,
      headers: { 'user-agent': 'MarsadCyber/1.0 (+https://cyber-security-industry-news.ae/)' },
    });
    if (!res.ok) return { feed, error: `HTTP ${res.status}`, items: [] };
    return { feed, error: null, items: parseFeed(await res.text()) };
  } catch (err) {
    return { feed, error: err.name === 'AbortError' ? 'таймаут' : err.message, items: [] };
  } finally {
    clearTimeout(timer);
  }
}

/** Значимые слова заголовка: по ним истории и сходятся. */
const STOP = new Set([
  'the', 'a', 'an', 'of', 'in', 'on', 'to', 'for', 'and', 'with', 'after', 'says',
  'new', 'from', 'that', 'this', 'its', 'are', 'was', 'were', 'has', 'have', 'had',
  'how', 'why', 'what', 'over', 'into', 'amid', 'more', 'than', 'about', 'could',
]);

function tokens(title) {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOP.has(w)),
  );
}

/** Доля общих слов. Жаккар, потому что заголовки разной длины. */
function similarity(a, b) {
  let shared = 0;
  for (const w of a) if (b.has(w)) shared += 1;
  const union = a.size + b.size - shared;
  return union === 0 ? 0 : shared / union;
}

const SAME_STORY = 0.34;

/**
 * Склейка одной истории из разных изданий.
 *
 * Сначала ключ собирался из шести слов заголовка, и совпадать он должен был
 * дословно. У каждой истории оказывался ровно один источник: издания пишут
 * заголовки по-разному, и «pCloud confirms password manager hack» не сходится
 * с «Password manager pCloud breached». Правило «минимум два источника»
 * отсекало бы при этом вообще всё.
 */
function cluster(items) {
  const out = [];
  for (const item of items) {
    const t = tokens(item.title);
    const hit = out.find((g) => similarity(g.tokens, t) >= SAME_STORY);
    if (hit) {
      hit.items.push(item);
      for (const w of t) hit.tokens.add(w);
    } else {
      out.push({ tokens: t, items: [item] });
    }
  }
  return out;
}

async function main() {
  const results = await Promise.all(FEEDS.map(readFeed));

  const alive = results.filter((r) => r.items.length > 0);
  const dead = results.filter((r) => r.items.length === 0);

  const since = Date.now() - WINDOW_HOURS * 3600 * 1000;
  const seen = new Set();
  const items = [];

  for (const { feed, items: raw } of alive) {
    for (const it of raw) {
      const ts = it.published ? Date.parse(it.published) : NaN;
      if (Number.isFinite(ts) && ts < since) continue;
      if (seen.has(it.link)) continue;
      seen.add(it.link);

      const haystack = `${it.title} ${it.summary}`;
      items.push({
        ...it,
        source: feed.id,
        weight: feed.weight,
        published_ts: Number.isFinite(ts) ? new Date(ts).toISOString() : null,
        is_security: SECURITY_SIGNAL.test(haystack),
        is_banned: BANNED_TOPICS.test(haystack),
      });
    }
  }

  // Истории: одна тема, несколько изданий. Число независимых изданий —
  // главный признак того, что история настоящая, а не пересказ пресс-релиза.
  const relevant = items.filter((it) => it.is_security && !it.is_banned);
  const ranked = cluster(relevant)
    .map((group) => {
      const sources = [...new Set(group.items.map((g) => g.source))];
      const topWeight = Math.max(...group.items.map((g) => g.weight));
      const region = group.items.some((g) => REGION_HOOK.test(`${g.title} ${g.summary}`));

      /*
       * Два независимых издания ИЛИ один первичный источник.
       *
       * Одного правила про два источника мало: разбор Talos или бюллетень
       * CISA существуют в единственном экземпляре по своей природе, и часто
       * это самое ценное за сутки. Требование второго издания вычеркнуло бы
       * ровно тот слой, ради которого вендорские блоги и добавлены.
       */
      const eligible = sources.length >= 2 || topWeight >= 3;

      return {
        eligible,
        why: sources.length >= 2 ? `${sources.length} независимых издания` : 'первичный источник',
        region_hook: region,
        sources,
        weight: group.items.reduce((n, g) => n + g.weight, 0) + (region ? 5 : 0),
        items: group.items.map(({ title, link, source, published_ts }) => ({
          title, link, source, published_ts,
        })),
      };
    })
    .sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.weight - a.weight);

  mkdirSync(resolve(process.cwd(), 'private'), { recursive: true, mode: 0o700 });
  writeFileSync(
    OUT,
    `${JSON.stringify(
      {
        fetched_at: new Date().toISOString(),
        window_hours: WINDOW_HOURS,
        feeds_total: FEEDS.length,
        feeds_alive: alive.length,
        feeds_dead: dead.map((d) => ({ id: d.feed.id, error: d.error })),
        items_total: items.length,
        stories: ranked,
      },
      null,
      2,
    )}\n`,
    { mode: 0o600 },
  );

  console.log(`лент живых ${alive.length} из ${FEEDS.length}, материалов ${items.length}`);
  if (dead.length > 0) {
    console.log('  не ответили:');
    for (const d of dead) console.log(`    ${d.feed.id}: ${d.error}`);
  }
  const eligible = ranked.filter((r) => r.eligible);
  console.log(`  историй по теме: ${ranked.length}, годных к разбору: ${eligible.length}`);
  console.log('\n  очередь на сегодня:');
  for (const s of eligible.slice(0, 10)) {
    const mark = s.region_hook ? '◆' : ' ';
    console.log(`   ${mark} [${s.why}] ${s.items[0].title.slice(0, 72)}`);
  }
  console.log('\n  ◆ — есть зацепка за ОАЭ или залив');
}

main().catch((err) => {
  console.error(`✖ ${err.message}`);
  process.exit(1);
});
