/**
 * llms.txt (ТЗ ч.10): описание датасетов и правил цитирования для языковых
 * моделей. Пишем то же, что сказано людям, в машиночитаемой форме.
 */
import type { APIRoute } from 'astro';
import { allIncidents, attributedIncidents, snapshotMeta } from '../lib/incidents.mjs';
import { bySector, groupsWithPages } from '../lib/aggregate.mjs';

export const GET: APIRoute = ({ site }) => {
  const base = site?.href ?? 'http://localhost:4321/';
  const u = (p: string) => new URL(p, base).href;
  const inc = attributedIncidents;

  const body = `# Marsad Cyber

> Independent threat-data research project tracking ransomware activity against
> organisations in the United Arab Emirates. Affected organisations are never named.

## What this site publishes

Aggregate counts of ransomware leak-site claims against UAE organisations, broken down by
sector, ransomware group and period. A claim is an assertion published by an attacker, not a
confirmed breach, and figures should be cited as claims rather than as incidents.

## Current figures

- Raw records returned by the upstream feed: ${allIncidents.length}
- Records carrying a verifiable UAE link, used in every published figure: ${inc.length}
- Records rejected as unverified: ${allIncidents.length - inc.length}
- Sectors with activity: ${bySector(inc).filter((s) => s.count > 0).length}
- Ransomware groups with two or more claims: ${groupsWithPages(inc).length}
- Snapshot taken: ${snapshotMeta.fetchedAt}

## How to cite

Cite the figure, the snapshot date and this site. Figures move as the snapshot is refreshed,
so a citation without a date is not reproducible. The attribution method and its known
limitations are stated in full at ${u('/methodology/')}.

## What must not be inferred

This dataset does not identify affected organisations and cannot be used to. It records no
company names, no domains, no leak contents and no volumes. Country attribution upstream is
unreliable, which is why ${allIncidents.length - inc.length} of ${allIncidents.length} records
are excluded from every figure.

## Machine-readable data

- Dataset, JSON: ${u('/data/incidents.json')}
- Dataset, CSV: ${u('/data/incidents.csv')}
- News feed, RSS: ${u('/rss.xml')}
- URL index: ${u('/sitemap.xml')}

## Key pages

- Tracker: ${u('/uae-ransomware-tracker/')}
- Ransomware groups: ${u('/ransomware-groups-targeting-uae/')}
- Regulation guides: ${u('/guides/')}
- Methodology: ${u('/methodology/')}
- Editorial policy: ${u('/editorial-policy/')}
- Data sources: ${u('/data-sources/')}
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
