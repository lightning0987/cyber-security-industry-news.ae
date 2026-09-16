# CLAUDE.md — Marsad Cyber

Static UAE cyber threat intelligence data hub. Astro, static output, zero client-side JavaScript.

---

## 0. The one rule that outranks everything

**No affected organisation may ever be identifiable in the built HTML.**

Not its name, not its domain, not the contents or volume of leaked data, not a `.onion`
address, not an employee name. This is a legal constraint under UAE Federal Decree-Law
No. 34 of 2021, not a style preference.

It is enforced structurally, in four layers:

1. `scripts/fetch-ransomware-live.mjs` strips the forbidden fields **in memory, before the
   first write to `src/`**. They do not exist in any file Astro can read.
2. `src/lib/incidents.mjs` parses with `z.object({...}).strict()` — an unexpected key fails
   the build, so a future loader change cannot quietly reintroduce a field.
3. `scripts/check-data.mjs` asserts the record key allowlist before Astro starts.
4. `scripts/guards/no-victim-data.mjs` hashes every n-gram of every built page and fails on
   any intersection with the committed fingerprint set.

**Never weaken any of these.** In particular, never add an allowlist exception to
`no-victim-data`. If it fires on something legitimate, remove the legitimate thing instead —
that is what happened with the TDRA link on `/data-sources/`.

Guard 4 is a backstop. Guards 1–3 are the actual protection.

---

## 1. Commands

```bash
npm run dev            # dev server
npm run fetch:ransomware  # refresh snapshot (needs salt; never part of build)
npm run check:data     # pre-build gates, no network
npm run build          # check:data && astro build && verify   ← the only build command
npm run preview        # http://localhost:4321
npm run ci             # lint + build, what CI runs
```

**`npm run build` is the command the host runs.** Never configure a host to run
`build:astro` directly: the guards live inside `build`, and a deploy that skips them would
publish a leak while looking green.

`fetch:*` is never part of `build`. The build is fully offline — that is why snapshots are
committed. A flaky upstream cannot break a deploy.

---

## 2. The salt

Fingerprints are salted. An unsalted hash of a company name is trivially brute-forced from a
list of UAE companies, which would make the published fingerprint file a re-identification
oracle.

- Local: `private/salt.txt` (gitignored, auto-created on first fetch).
- CI: secret `VICTIM_HASH_SALT`, **the same value**.

The salt must be identical everywhere fingerprints are computed or checked. If it differs,
the guard finds no matches and silently passes. `salt_id` in the fingerprint file exists to
catch exactly that, and a mismatch is fatal.

Losing the salt means recomputing every fingerprint from `private/`.

---

## 3. Architecture

```
scripts/
  lib/http.mjs         retry + content-type assert (upstream 404s ~50% of the time)
  lib/snapshot.mjs     envelope + regression defence
  lib/fingerprint.mjs  salted hashing, n-grams
  fetch-*.mjs          ← the strip boundary
  check-data.mjs       pre-build gates
  verify.mjs           post-build guard orchestrator
  guards/*.mjs         no-victim-data, unique-meta, link-graph, dist-hygiene
src/
  data/                committed snapshots + fingerprints + entity map
  lib/                 incidents (the only record source), aggregate, routes, seo, nav
  lib/taxonomy/        sectors.mjs, groups.mjs  ← shared by Node scripts and Astro
private/               GITIGNORED. Nothing in src/ may reference it.
```

`src/lib/*` is `.mjs`, not `.ts`, because `scripts/` and Astro both import the taxonomy and
Node cannot import TypeScript without a loader. One source of truth beats a split brain.

Records are a plain typed module, **not a content collection**. Collections persist a second
copy of the data in `.astro/data-store.json` and cache it across builds, which works against
the auditability this project needs.

---

## 4. Data rules

- Every number on the site must come from a snapshot. Never hand-write or estimate one.
- Headline figures use `attributedIncidents` (confirmed + probable), never `allIncidents`.
  Country tagging upstream is unreliable; see `/methodology/`.
- `fetched_at` renders as "Data as of" on every data page. Never hardcode a date.
- A loader never overwrites a good snapshot with a suspicious one. `defendAgainstRegression`
  refuses on a >10% record drop or a vanished sector/group. This matters more than retries:
  a truncated response looks like success and silently deletes pages.
- An unknown sector label never auto-creates a URL. It fails the build; a human adds one line
  to `src/lib/taxonomy/sectors.mjs`.

---

## 5. Meta rules

- Title: primary key phrase inside the first 60 characters, 45–65 total, number early.
- Description: 80–158 characters, first sentence carries a number and a period.
- H1: clean noun phrase, exactly one per page, never identical to Title.
- No emoji. No "Everything You Need to Know", "Ultimate Guide", "Complete Guide".
- Titles and descriptions are unique site-wide. `unique-meta` blocks the build otherwise —
  at ~50 programmatic pages an unset variable produces a hundred identical titles invisibly.
- Truncated tables must receive a `total` prop. A `Total` row that sums only visible rows
  contradicts the page headline.

---

## 6. Internal linking

- Every internal link is a real `<a href>` in static HTML. No `onclick`, no JS navigation.
  `dist-hygiene` fails on an `<a>` without `href`.
- Sibling rails (`SiblingRail.astro`) render the full sibling list on every sector, period and
  group page. This satisfies "≥3 inbound links per page" mechanically — never hand-curate.
- `link-graph` enforces: zero orphans, ≥3 inbound per page, depth ≤3 from home, no broken
  internal links.
- Footer carries 35–45 links in five columns, built from `src/lib/nav.mjs` so it can only
  point at pages that exist.
- Anchors are descriptive and carry the entity. Never "read more", "click here", "learn more".
- 2–7 outbound dofollow links to primary sources per content page. Allowed hosts are listed in
  `no-victim-data.mjs`; anything else fails the build.

---

## 7. Design

- Light monochrome, reference lines.com. Tokens in `src/styles/tokens.css`.
- **System font stack only.** Zero external font requests. Zero external requests of any kind.
- Monospace (`.mono`, `.num`) for measured values: identifiers, counts, table figures. Not for
  dates inside prose — use `formatDayLong()` there.
- Hairline rules, never shadows. One accent colour, reserved for data emphasis.
- Every value must be readable as text. A chart is a duplicate of a number, never its carrier.
- No three consecutive paragraphs without a visual break: callout, table, or stat bar.
- Graphics only, never emoji.
- **Astro collapses a newline between text and a tag into nothing.** `across\n<strong>13</strong>`
  renders as "across13". Use an explicit `{' '}`. This bug hit 30 places on the first build.
- Invoke the `frontend-design` skill before writing frontend code, then screenshot from
  `localhost` (never `file://`) and do at least two comparison rounds.

---

## 8. Promo slots

Three slots exist in the markup and are controlled by `src/config/promo.json`. All are
`enabled: false` and emit zero bytes. Enabling is a JSON edit plus a rebuild. They stay off
until there is traffic: an ad earns nothing at zero traffic and costs the independent-research
positioning the project depends on.

---

## 9. What never enters this repository

- Any mention of the client, the agency, or the parent brand — in code, comments, README,
  commit messages or built HTML. `dist-hygiene` checks the built output.

  The forbidden-term list is stored as **salted hashes** in `src/data/forbidden-terms.json`.
  The plaintext lives in `private/forbidden-terms.txt` and is never committed: a guard that
  held those strings in cleartext would put into the public repository exactly what it exists
  to keep out. Edit the private file, then run `node scripts/build-forbidden-terms.mjs`.
- The brief or the specification document itself.
- API keys. Secrets only, via GitHub Actions.
- Anything under `private/`.

Site brand is **Marsad Cyber**; author byline **Marsad Research Team**; operator line
"Marsad Cyber is an independent threat-data research project". Language is English only,
`lang="en"`, no Arabic, no hreflang.

Never claim DESC, NESA or ISO 27001 accreditation, and never offer certification as a service.
Describing what a regulation requires is fine; claiming to certify against it is not.

---

## 10. Checklist after any significant change

```
npm run build          must exit 0

Data
[ ] every figure traces to a snapshot; sector rows + unclassified = record_count
[ ] "Data as of" reflects fetched_at, not the build date
[ ] loader refuses a regressed snapshot (test with a truncated response)

Legal
[ ] no victim name or domain in dist/  (test: inject a fingerprint string, build must fail)
[ ] no .onion address anywhere
[ ] no client or agency mention in dist/ or in git history

Meta
[ ] titles and descriptions unique, within length, no emoji, no stop phrases
[ ] exactly one H1 per page, H1 not identical to Title
[ ] self-referential canonical on every indexable page

Linking
[ ] zero orphans, depth ≤3, ≥3 inbound per page
[ ] every link visible with JavaScript disabled
[ ] footer 35–45 links, no broken targets

Frontend
[ ] all data readable with JavaScript disabled
[ ] no <a> without href, no onclick
[ ] two screenshot rounds done from localhost
[ ] Lighthouse ≥95 Performance and SEO
```

A guard that has never failed is an unverified guard. Test the leak guard and the regression
guard deliberately, and confirm they actually block.
