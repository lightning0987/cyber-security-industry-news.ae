#!/usr/bin/env node
/**
 * Экспорт брифов для ручной генерации текстов.
 *
 * Первая итерация контента делается не через API, а руками: один бриф
 * отдаётся в обычный чат вместе с prompts/content-brief.md, готовый текст
 * возвращается файлом в src/content/pages/.
 *
 * В бриф попадают ТОЛЬКО числа и сущности. Ничего идентифицирующего жертву в
 * нём быть не может: этих полей не существует уже на входе в src/.
 *
 * Запуск: npm run briefs
 */

import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { attributedIncidents, snapshotMeta, unverifiedIncidents } from '../src/lib/incidents.mjs';
import {
  bySector, byPeriod, byGroup, groupsWithPages, inSector, inPeriod, inGroup, activitySpan, top,
} from '../src/lib/aggregate.mjs';
import { PERIODS, ROUTES } from '../src/lib/routes.mjs';
import { frameworksForSector, EXCLUDED_NOTE } from '../src/lib/frameworks.mjs';

const OUT = resolve(process.cwd(), 'briefs');
mkdirSync(OUT, { recursive: true });

const inc = attributedIncidents;
const sectors = bySector(inc);
const periods = byPeriod(inc);
const groups = byGroup(inc);
const paged = groupsWithPages(inc);
const TOTAL = inc.length;

const pct = (n, d = TOTAL) => (d === 0 ? 0 : Math.round((n / d) * 1000) / 10);
const nonZeroSectors = sectors.filter((s) => s.count > 0);
const avgSector = Math.round((TOTAL / nonZeroSectors.length) * 10) / 10;

/** Общий для всех брифов контекст: чтобы текст не противоречил остальному сайту. */
const SITE_CONTEXT = {
  brand: 'Marsad Cyber',
  language: 'English (UK spelling: organisation, not organization)',
  data_as_of: snapshotMeta.fetchedAt,
  totals: {
    raw_records_from_upstream: snapshotMeta.recordCount,
    attributed_claims_used_in_all_figures: TOTAL,
    rejected_as_unverified: unverifiedIncidents.length,
    rejection_rate_pct: pct(unverifiedIncidents.length, snapshotMeta.recordCount),
    distinct_groups: groups.length,
    sectors_with_activity: nonZeroSectors.length,
    average_claims_per_active_sector: avgSector,
  },
  hard_rules: [
    'NEVER name, describe or hint at an affected organisation. Sector, group and date only.',
    'NEVER mention .onion addresses, leak contents, data volumes or employee names.',
    'NEVER claim DESC, NESA or ISO 27001 accreditation. Never offer certification as a service.',
    'NEVER invent a number. Every figure must appear in this brief. If unsure, write [VERIFY].',
    'A leak-site claim is an attacker assertion, not a confirmed breach. Word it that way.',
    EXCLUDED_NOTE,
  ],
};

function write(name, brief) {
  writeFileSync(resolve(OUT, `${name}.json`), `${JSON.stringify(brief, null, 2)}\n`, 'utf8');
}

/* ─── Секторы ────────────────────────────────────────────────────── */
for (const s of sectors) {
  const subset = inSector(inc, s.slug);
  const span = activitySpan(subset);
  const rank = sectors.findIndex((x) => x.slug === s.slug) + 1;

  write(`sector-${s.slug}`, {
    page_type: 'sector',
    url: ROUTES.sector(s.slug),
    entity: s.label,
    existing_h1: `Ransomware Attacks on ${s.label} in the UAE`,
    site_context: SITE_CONTEXT,
    facts: {
      claims_in_this_sector: s.count,
      share_of_all_uae_claims_pct: pct(s.count),
      rank_among_sectors: `${rank} of ${sectors.length}`,
      versus_average_active_sector: `${s.count} against an average of ${avgSector}`,
      first_claim: span.first,
      most_recent_claim: span.last,
      distinct_groups_active_here: byGroup(subset).length,
    },
    groups_active_here: top(byGroup(subset), 8).map((g) => ({
      name: g.label, claims: g.count, share_of_sector_pct: pct(g.count, s.count),
    })),
    by_period: periods.map((p) => ({
      period: p.label,
      claims: subset.filter((i) => i.year >= p.from && i.year <= p.to).length,
    })),
    regulatory_context: frameworksForSector(s.slug),
    what_the_page_already_says:
      'A lede paragraph with the headline count, a stat bar, a table of groups active in this sector, and a table of claims by period. Do not repeat these. Add what they do not say.',
  });
}

/* ─── Периоды ────────────────────────────────────────────────────── */
periods.forEach((p, i) => {
  const subset = inPeriod(inc, p);
  const prev = i > 0 ? periods[i - 1] : null;
  const change = prev && prev.count > 0
    ? Math.round(((p.count - prev.count) / prev.count) * 1000) / 10
    : null;

  write(`period-${p.slug}`, {
    page_type: 'period',
    url: ROUTES.period(p.slug),
    entity: p.label,
    existing_h1: `UAE Ransomware Attacks in ${p.label}`,
    site_context: SITE_CONTEXT,
    facts: {
      claims_in_this_period: p.count,
      share_of_all_uae_claims_pct: pct(p.count),
      previous_period: prev ? { period: prev.label, claims: prev.count } : null,
      change_versus_previous_pct: change,
      is_partial_year: p.slug === '2026',
      note: p.archive
        ? 'This page combines 2020, 2021 and 2022 because each single year holds too few claims to describe a pattern.'
        : null,
    },
    by_sector: sectors.map((s) => ({
      sector: s.label,
      claims: subset.filter((x) => x.sector === s.slug).length,
    })).filter((x) => x.claims > 0),
    top_groups: top(byGroup(subset), 8).map((g) => ({ name: g.label, claims: g.count })),
    what_the_page_already_says:
      'A lede with the headline count, a stat bar, a table of groups active in the period, and a table of claims by sector. Do not repeat these.',
  });
});

/* ─── Группы ─────────────────────────────────────────────────────── */
for (const g of paged) {
  const subset = inGroup(inc, g.slug);
  const span = activitySpan(subset);
  const rank = groups.findIndex((x) => x.slug === g.slug) + 1;
  const sectorRows = sectors
    .map((s) => ({ sector: s.label, claims: subset.filter((i) => i.sector === s.slug).length }))
    .filter((x) => x.claims > 0)
    .sort((a, b) => b.claims - a.claims);
  const family = subset[0]?.group_family ?? null;

  write(`group-${g.slug}`, {
    page_type: 'group',
    url: ROUTES.group(g.slug),
    entity: g.label,
    existing_h1: `${g.label} Ransomware Activity in the UAE`,
    site_context: SITE_CONTEXT,
    facts: {
      claimed_uae_organisations: g.count,
      share_of_all_uae_claims_pct: pct(g.count),
      rank_among_groups: `${rank} of ${groups.length}`,
      most_active_group_for_comparison: { name: groups[0].label, claims: groups[0].count },
      first_claim: span.first,
      most_recent_claim: span.last,
      sectors_targeted: sectorRows.length,
      family: family,
      family_note: family
        ? `Versioned variants of ${family} are counted separately on this site. Merging them would be an editorial claim about actor identity, not a fact in the source data.`
        : null,
    },
    by_sector: sectorRows,
    by_period: periods.map((p) => ({
      period: p.label,
      claims: subset.filter((i) => i.year >= p.from && i.year <= p.to).length,
    })),
    regulatory_context: sectorRows.length > 0
      ? frameworksForSector(sectors.find((s) => s.label === sectorRows[0].sector)?.slug)
      : [],
    what_the_page_already_says:
      'A lede with the claim count and concentration sector, a stat bar, a table by sector and a table by period. Do not repeat these.',
  });
}

const n = sectors.length + periods.length + paged.length;
console.log(`✓ ${n} брифов записано в briefs/`);
console.log(`  секторы ${sectors.length}, периоды ${periods.length}, группы ${paged.length}`);
console.log('  Отдавай по одному брифу вместе с prompts/content-brief.md');
