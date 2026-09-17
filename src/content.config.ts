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
  }),
});

export const collections = { pages, guides };
