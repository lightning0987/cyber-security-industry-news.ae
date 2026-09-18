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

## 1a. How the site stays current

No paid API is involved. Data refreshes itself; articles are written by hand.

- `fetch-data.yml` runs daily at 02:00 UTC: fetch, rebuild briefs, commit both, then build.
- The build step runs **after** the commit on purpose. Data is fact and belongs in the repository.
  If the new numbers no longer match a sentence in `src/content/pages/`, `lint:content` fails, the
  deploy does not happen, and the site keeps serving the last correct version.
- That red run is the notification. It fires when there is something to fix, which a calendar
  reminder cannot do. Fix the sentence, push, deploy resumes.
- `npm run events` is the other half of the loop. It diffs the current snapshot against the last
  version in git history that differs from it, and prints what a human needs: which figures moved
  and which file owns each one, then new claims (T1 leads), a group appearing in the UAE set for
  the first time and sector spikes (T2 leads). A spike is computed for both snapshots and reported
  only when it is new — a spike is a property of the data, not of the change, so measuring one
  snapshot would put the same lead in every run until people stopped reading it. `--against-file`
  compares against a saved snapshot, `--json` for machine use.
- `health-check.yml` runs every six hours and only reports. The build is offline, so a dead source
  cannot break a deploy — which is exactly why it has to be watched separately, or the first sign
  would be a snapshot that has not moved in a week.

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

## 4a. Editorial text on data pages

Data pages carry ~240 words of template prose. Additional editorial context lives in
`src/content/pages/<brief-name>.md` and renders below the tables. A page without a matching
file simply renders without the block, so this fills in incrementally.

First iteration is written by hand, not through the API:

```bash
npm run briefs          # writes one JSON per page into briefs/ (gitignored)
# paste prompts/content-brief.md into a chat, then one brief after it
# save the reply to src/content/pages/<same name>.md
npm run lint:content    # deterministic checks; Critical blocks the build
```

`lint:content` runs inside `npm run build`. It enforces the prompt's rules mechanically: no
em or en dashes, no banned paragraph openings, no vague quantifiers, no filler, 250–400 words,
three H2s, sentences ≤20 words, and claims worded as claims.

**The check that matters most is the number check.** Every numeral in the text must appear in
the matching brief. Facts here come from an API with a known schema, so the correct verification
is reconciliation against the source record, not a web search. An invented figure is Critical
and blocks publication.

**Brief files are committed, and that is deliberate.** While they were gitignored the number check
worked only on the author's machine: a clean CI checkout had no briefs, the check degraded from
Critical to an optional warning, and a figure that had drifted away from the data would have
shipped silently. A brief holds the same aggregates the snapshot already publishes, nothing from
an affected organisation, and `check-data` proves that on every build by scanning every brief
against the fingerprint set.

Two Critical rules follow. A missing brief fails the build, because a file whose numbers cannot be
checked is a file that was not checked. And a brief whose `data_as_of` differs from the snapshot's
`fetched_at` fails too: a stale brief would confirm a stale figure with exactly the same confidence
as a current one.

Regenerate briefs in the same commit as the snapshot. `fetch-data.yml` does this automatically.

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

## 5a. News (T1 and T2)

Articles live in `src/content/news/*.md` and publish at `/news/<slug>/`. Category and date live in
frontmatter and drive `/news/category/<c>/` and `/news/archive/<year>/<month>/` programmatically.

**Every page sits under its section. Nothing editorial lives at the root.** Articles were flat
`/<slug>/` at first, which put them in the same namespace as `/about/` and `/contact/`: the section
could not be segmented in analytics or in search reports, and the hierarchy was invisible to a
crawler. Only the site's own service pages belong at the root.

**The category is not in the path.** An article's category can be reassigned; its URL may not
change after publication. The section prefix already gives the segmentation, so putting the
category in the path would buy nothing and cost a redirect every time an editor changes their mind.

`category` and `archive` are reserved article slugs and `check-data` fails on them. Astro would
build both routes without complaining and the last one written would win.

Categories are created only where articles exist. `src/lib/news-registry.mjs` duplicates the
active categories so `nav.mjs` can stay synchronous.

T1 briefs run 250–400 words, T2 analyses 600–950, enforced by `lint:content`. Every figure must
appear in some brief or in `entity-map.json`, because those two files are the whole set of facts
the site holds.

---

## 6a. Guides (T3)

Long-form regulatory guides live in `src/content/guides/*.md` and render at `/guides/<id>/`.
Frontmatter is schema-validated in `src/content.config.ts`.

`src/lib/guides.mjs` duplicates the slugs so that `nav.mjs` can stay synchronous. `check-data`
fails the build if the registry and the files disagree, because a mismatch produces dead links
in the footer and sidebar.

Guides run 1200 to 2500 words, per part 2 of the specification. The linter's lower bound was set
to 1000 once and all four guides settled at 1043 to 1076, below the requirement, with nothing
reporting it. A loosened threshold does not merely permit the violation, it conceals it.

Every guide carries a section quantifying how much of the UAE claim record sits in sectors that
usually fall inside that framework's scope. Those figures come from `site_context.regulatory_scope`
in the briefs, computed from `frameworks.mjs` and the snapshot, so they are checked like any other
number. Each such section states that sector is a proxy and that scope is decided by the
designating authority, because the mapping is an indication and presenting it as a scoping test
would be false.

Guides describe what a framework requires. They never claim accreditation, never offer
certification or compliance assessment, and never mention ADHICS or CBUAE, which are out of
scope pending review. Every guide ends with a disclaimer block stating the project holds no
accreditation.

---

## 7. Design

- Light monochrome, reference lines.com. Tokens in `src/styles/tokens.css`.
- **System font stack only.** Zero external font requests. Zero external requests of any kind.
- Monospace (`.mono`, `.num`) for measured values: identifiers, counts, table figures. Not for
  dates inside prose — use `formatDayLong()` there.
- Hairline rules, never shadows. One accent colour, reserved for data emphasis.
- Every value must be readable as text. A chart is a duplicate of a number, never its carrier.
  `TimelineChart.astro` writes each value as an SVG `<text>` node and repeats the series in its
  caption, so a reader parsing HTML gets numbers rather than geometry.
- `public/js/table-sort.mjs` is the **only** script on the site, and `dist-hygiene` fails on any
  other. It is progressive enhancement: every value is already in the HTML, and the script only
  reorders existing rows.
- No three consecutive paragraphs without a visual break: callout, table, or stat bar.
- Graphics only, never emoji.
- **Astro collapses a newline between text and a tag into nothing.** `across\n<strong>13</strong>`
  renders as "across13". Use an explicit `{' '}`. This bug hit 30 places on the first build.
- Invoke the `frontend-design` skill before writing frontend code, then screenshot from
  `localhost` (never `file://`) and do at least two comparison rounds.
- **Check `images/` for reference screenshots before designing, and compare against them.**
  Building from a written description of a reference is not the same as looking at it. The
  first build did that and produced a layout with no sidebar and none of the reference's
  recirculation blocks.
- **Run `npm run check:mobile` against a running preview.** Grid tracks declared `1fr` carry an
  implicit `min-width: auto`, so one wide table stretches the whole page into horizontal scroll.
  Use `minmax(0, 1fr)`. This defect shipped once and is invisible at desktop width.
- **Navigation never depends on the sort script.** The mobile menu is a hidden checkbox plus a
  label; the links stay in the markup whether it is open or not.
- **The sector rail is a shortcut, not an index.** Six sectors plus a link to all of them, on one
  line. Thirteen do not fit: scrolling hides the rest behind an overlay scrollbar that reserves no
  space and cannot be grabbed with a mouse, and wrapping eats the first screen. The full list is in
  the footer, the sidebar and the tracker hub, all present on every page.
- **A byline belongs on every editorial page and on none of the service pages.** `/sitemap/` and
  `/credits/` carry no author. The author name links to `/about/` and is underlined, because a
  link that does not look like one is not a link.
- **A grid whose item count is fixed gets explicit columns.** Five periods in an `auto-fit` grid
  produced four in a row and one empty cell.
- **A recirculation block picks one anchor for all its rows.** Thumbnails appear only when every
  item has one, otherwise every row gets the number tile. A block where sectors carried photos and
  groups did not read as broken. A bare number also always carries its unit.
- **Nothing sits flush against a divider.** Stat cells, table cells and sidebar figures carry left
  padding; content touching the rule to its left reads as clipped.
- Footer is five fixed columns, not `auto-fit`. A sixth column wrapped onto a second row and landed
  under columns of unequal height, which made the whole footer look collapsed.
- A callout is there to stop the eye: body size or larger, generous padding, never the first block
  of a page. The editorial summary above it is a standfirst and must not be styled as a callout.
- Nested cards are a bug. `.prose` inside `.section` or `.page-context` is already on white and
  drops its own border.
- Layout is two-column: content plus a sticky sidebar (`Sidebar.astro`) on every page.
  The sidebar is a linking surface, not decoration: it carries roughly 30 internal links.
- Headings are uppercase with tight tracking, matching the reference. Prose is not.
- Every entity page carries a byline row, an `AlsoRead` insert after the second section, and
  three `RecircList` blocks (related, more of the same kind, most targeted).

---

## 7a. Images

Photographs live in `public/images/photos` and are served from this domain. Nothing loads from
a third-party host, photographs included, which is what keeps the site at zero external
requests.

`src/data/images.json` is the registry: slug, alt text, hero and thumbnail paths, photographer
and source. Only the standard Unsplash Licence is acceptable. **Never use a `plus.unsplash.com`
URL** — that is Unsplash+, a paid tier, and it is not free for commercial use.

Every image carries explicit `width` and `height` to avoid layout shift, `alt` text that
describes the subject, and `loading="lazy"` unless it is the hero. Heroes stay under 250 KB.

Photographs illustrate and carry no data. Every figure lives in the text and the tables, so
nothing is lost when images fail to load. `/credits/` lists every photographer.

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
[ ] two screenshot rounds done from localhost, compared against images/reference-*.jpg
[ ] npm run check:mobile passes (no horizontal overflow at 360, 390 and 768px)
[ ] no glued words (guard catches Astro's newline collapse between an expression and text)
[ ] editorial text does not restate the template lede (content-overlap guard, 30% ceiling)
[ ] Lighthouse ≥95 Performance and SEO
```

A guard that has never failed is an unverified guard. Test the leak guard and the regression
guard deliberately, and confirm they actually block.
