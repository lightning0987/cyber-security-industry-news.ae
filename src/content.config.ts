/**
 * Редакционная проза для страниц данных.
 *
 * Здесь content collection уместна, в отличие от записей об инцидентах: это
 * markdown, по файлу на страницу, с человеческим авторством. Возражение из
 * CLAUDE.md касалось именно записей — лишняя копия данных в .astro/data-store
 * мешает проверяемости чисел. К прозе это не относится.
 *
 * Имя файла = имя брифа. sector-technology.json → sector-technology.md
 * Файла нет — страница просто рендерится без блока контекста.
 */
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    summary: z.string().min(20).max(300).optional(),
  }),
});

/**
 * Опорные гайды (T3). Проза с человеческим авторством, поэтому коллекция здесь
 * уместна по той же причине, что и для страниц данных.
 */
const guides = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/guides' }),
  schema: z.object({
    title: z.string().min(10).max(65),
    h1: z.string().min(10),
    description: z.string().min(80).max(158),
    summary: z.string().min(40).max(320),
    standard: z.string(),
    order: z.number().int(),
    updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    /** Ключевые факты рамки. Рендерятся врезкой в начале гайда. */
    keyFacts: z.array(z.object({ label: z.string(), value: z.string() })).min(2).max(5),
    /**
     * FAQ. Каждый вопрос называет сущность, каждый ответ начинается с прямого
     * утверждения. Идёт в разметку FAQPage (ТЗ ч.10) и раскрывается без JS.
     */
    faq: z.array(z.object({ q: z.string().min(15), a: z.string().min(60).max(700) })).min(3).max(5),
  }),
});

/**
 * Новостные материалы (T1 и T2).
 *
 * URL плоские: /<slug>/. Рубрика и дата живут во frontmatter и формируют
 * /category/<...>/ и /news/<year>/<month>/ программно.
 */
const news = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/news' }),
  schema: z.object({
    title: z.string().min(10).max(65),
    h1: z.string().min(10),
    description: z.string().min(80).max(158),
    dek: z.string().min(60).max(320),
    category: z.enum(['ransomware', 'threat-intel', 'regulation', 'vulnerabilities']),
    tier: z.enum(['T1', 'T2']),
    published: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    /** Сущности материала. Из них строятся связи, как и на страницах данных. */
    entities: z.object({
      sectors: z.array(z.string()).default([]),
      groups: z.array(z.string()).default([]),
      periods: z.array(z.string()).default([]),
    }),
    sources: z.array(z.object({ label: z.string(), href: z.string() })).min(1),
  }),
});

export const collections = { pages, guides, news };
