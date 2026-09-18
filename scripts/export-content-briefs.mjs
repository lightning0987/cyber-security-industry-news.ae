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

import { mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { attributedIncidents, snapshotMeta, unverifiedIncidents } from '../src/lib/incidents.mjs';
import {
  bySector, byPeriod, byGroup, groupsWithPages, groupsWithoutPages, inSector, inPeriod, inGroup, activitySpan, top,
} from '../src/lib/aggregate.mjs';
import { PERIODS, ROUTES } from '../src/lib/routes.mjs';
import { frameworksForSector, sectorsForFramework, FRAMEWORKS, EXCLUDED_NOTE } from '../src/lib/frameworks.mjs';
import { MIN_INCIDENTS_FOR_PAGE } from '../src/lib/taxonomy/groups.mjs';

const OUT = resolve(process.cwd(), 'briefs');
// Каталог пересобирается с нуля. Брифы коммитятся, поэтому бриф удалённой
// страницы остался бы в репозитории навсегда и пережил бы саму страницу.
rmSync(OUT, { recursive: true, force: true });
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

/**
 * Сколько эмиратских заявлений приходится на секторы, которые обычно попадают
 * в периметр каждой регуляторной рамки.
 *
 * Сектор — это ПРОКСИ, а не определение периметра: попадает организация под
 * стандарт или нет, решает назначающий орган, а не отраслевая метка. Но без
 * этой оценки читателю нечем соотнести регуляторную обязанность с реальным
 * объёмом угрозы, и такого соотнесения нет больше нигде.
 */
const REGULATORY_SCOPE = Object.entries(FRAMEWORKS).map(([key, f]) => {
  const slugs = sectorsForFramework(key);
  const rows = sectors.filter((s) => slugs.includes(s.slug) && s.count > 0);
  const claims = rows.reduce((n, s) => n + s.count, 0);
  return {
    framework: f.name,
    sectors_usually_in_scope: rows.length,
    claims_in_those_sectors: claims,
    share_of_all_attributed_claims_pct: pct(claims),
    by_sector: rows.map((s) => ({ sector: s.label, claims: s.count })),
    caveat: 'Sector is a proxy. Scope is decided by the designating authority, not by industry label.',
  };
});

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
  regulatory_scope: REGULATORY_SCOPE,
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
/* Полный ряд периодов с лидером каждого. Страница периода без него не может
   сказать главного: лидирующие группы меняются от периода к периоду. */
const PERIOD_SERIES = periods.map((p) => {
  const subset = inPeriod(inc, p);
  const lead = byGroup(subset)[0] ?? null;
  return {
    period: p.label,
    claims: p.count,
    leading_group: lead ? { name: lead.label, claims: lead.count } : null,
  };
});

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
    all_periods_for_comparison: PERIOD_SERIES,
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
  // Родственные варианты: страница рендерит блок про них, значит бриф обязан
  // отдавать их имена, иначе текст сошлётся на число, которого в брифе нет.
  const siblings = family
    ? paged
        .filter((x) => x.slug !== g.slug && inGroup(inc, x.slug)[0]?.group_family === family)
        .map((x) => ({ name: x.label, claims: x.count }))
    : [];

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
      family_siblings: siblings,
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

/* ─── Длинный хвост групп ────────────────────────────────────────── */
/*
 * Собственный бриф у страницы, которая заменила пятнадцать почти одинаковых.
 * Её содержание — не перечисление групп, а соотношение: хвост держит больше
 * заявлений, чем все группы с устойчивым следом вместе взятые.
 */
{
  const tail = groupsWithoutPages(inc);
  const tailClaims = tail.reduce((n, g) => n + g.count, 0);
  const pagedClaims = paged.reduce((n, g) => n + g.count, 0);
  const repeat = tail.filter((g) => g.count > 1);

  write('groups-short-record', {
    page_type: 'groups-short-record',
    url: ROUTES.shortRecord(),
    entity: 'Ransomware groups with a short UAE record',
    existing_h1: 'Ransomware Groups With a Short UAE Record',
    site_context: SITE_CONTEXT,
    facts: {
      threshold_for_own_page: MIN_INCIDENTS_FOR_PAGE,
      groups_total: groups.length,
      groups_below_threshold: tail.length,
      groups_with_own_page: paged.length,
      claims_held_by_tail: tailClaims,
      claims_held_by_paged: pagedClaims,
      tail_share_of_all_claims_pct: Math.round((tailClaims / inc.length) * 1000) / 10,
      groups_seen_exactly_once: tail.filter((g) => g.count === 1).length,
      groups_with_two_to_four_claims: repeat.length,
      attributed_claims_total: inc.length,
    },
    by_group: repeat.map((g) => {
      const records = inGroup(inc, g.slug);
      const dates = records.map((r) => r.discovered).filter(Boolean).sort();
      return {
        group: g.label,
        claims: g.count,
        sectors: new Set(records.map((r) => r.sector).filter(Boolean)).size,
        first_claim: dates[0],
        most_recent_claim: dates.at(-1),
      };
    }),
    what_the_page_already_says:
      'A lede comparing tail claims against sustained groups, a stat bar, and a table of groups with two to four claims. Do not repeat these.',
  });
}

const n = sectors.length + periods.length + paged.length + 1;
console.log(`✓ ${n} брифов записано в briefs/`);
console.log(`  секторы ${sectors.length}, периоды ${periods.length}, группы ${paged.length}, длинный хвост 1`);
console.log('  Отдавай по одному брифу вместе с prompts/content-brief.md');
