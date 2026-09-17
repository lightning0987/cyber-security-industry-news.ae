/** CSV-вариант того же датасета (ТЗ ч.10). */
import type { APIRoute } from 'astro';
import { attributedIncidents } from '../../lib/incidents.mjs';

const COLUMNS = ['id', 'group', 'group_slug', 'sector', 'sector_label', 'discovered', 'year', 'month', 'ae_confidence'];

export const GET: APIRoute = () => {
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = attributedIncidents.map((r: Record<string, unknown>) =>
    COLUMNS.map((c) => esc(r[c])).join(','),
  );
  return new Response([COLUMNS.join(','), ...rows].join('\n'), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8' },
  });
};
