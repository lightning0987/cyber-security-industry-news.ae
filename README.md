# Marsad Cyber

Static data hub tracking ransomware activity against organisations in the United Arab
Emirates. Astro, static output, no client-side JavaScript, no external requests.

## Quick start

```bash
npm install
npm run fetch:ransomware   # creates private/salt.txt on first run
npm run build              # check:data && astro build && verify
npm run preview            # http://localhost:4321
```

## What makes this repository unusual

Affected organisations are never identifiable in the published output. Identifying fields are
removed when data is collected, before anything is written to `src/`, and four independent
checks enforce that. The build fails rather than publishing a page that identifies anyone.

Read `CLAUDE.md` before changing anything under `scripts/` or `src/lib/`.

## Layout

| Path | Purpose |
|---|---|
| `scripts/fetch-*.mjs` | Data loaders. The strip boundary lives here. |
| `scripts/guards/` | Post-build checks that block publication. |
| `src/data/` | Committed snapshots. The only source of figures on the site. |
| `src/lib/` | Record access, aggregation, routing, meta. |
| `private/` | Gitignored. Raw records and the fingerprint salt. |

`scripts/SOURCES.md` records what each upstream endpoint actually returned when tested.

## Build

`npm run build` is the only build command. It runs the pre-build data gates, builds, then runs
the post-build guards. A host must be configured to run it — not `astro build` — or the guards
are skipped.

Requires Node 22 and, for fetching only, the `VICTIM_HASH_SALT` secret.
