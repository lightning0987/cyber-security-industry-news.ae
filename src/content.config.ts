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

export const collections = { pages };
