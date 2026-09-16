# Data sources — verification log

Every source was called from a real machine before being designed into the site.
Status here is what the endpoint actually returned, not what documentation claims.

Last verified: **2026-09-16**

## In use

| Source | Endpoint | Auth | Status |
|---|---|---|---|
| ransomware.live | `GET https://api.ransomware.live/v2/countryvictims/AE` | none | ✅ 182 records. **Returns an HTML 404 page instead of JSON roughly half the time**, with no auth error and no pattern. Retry with backoff succeeds, typically on attempt 2–4. A loader that does not assert `content-type` will silently ingest an HTML error page. |

Response is a bare JSON **array**, not an object. Record fields:
`activity`, `country`, `data_size`, `description`, `discovered`, `group_name`,
`post_title`, `published`, `ransom`, `website`, `post_url`.

Of these, `post_title`, `website`, `description` and `post_url` identify the victim and are
stripped in the loader. `description` is the easy one to miss: it names the organisation in
prose, for example "The X Trust is a ... provider founded in ...".

There is **no emirate field**. Emirate-level breakdowns are not derivable from this source.

## Verified, queued for sprint 2

| Source | Endpoint | Status |
|---|---|---|
| CISA KEV | `GET https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json` | ✅ 1710 records, `catalogVersion 2026.09.14`. Stable. |
| FIRST.org EPSS | `GET https://api.first.org/data/v1/epss?cve={id}` | ✅ Stable. Batch by CVE; 1710 single calls per build is not acceptable. |
| WAM | `https://www.wam.ae/en/sitemap/news.xml` | ✅ Google News sitemap, 214 items with `news:title` and `news:publication_date`, fresh to the minute. **WAM has no RSS** — this was found via `robots.txt`. |
| Khaleej Times | `https://www.khaleejtimes.com/news_sitemap.xml` | ✅ 216 items. |
| Gulf News | `https://gulfnews.com/news_sitemap.xml` | ✅ 309 items. |
| The National | `https://www.thenationalnews.com/arc/outboundfeeds/news-sitemap-index/?outputType=xml` | ✅ Use the **index**; the plain `news-sitemap` returns only 3 URLs. |

The four outlet sitemaps matter for a specific reason: the editorial policy permits naming an
organisation only where a licensed UAE outlet has already reported the incident, citing that
outlet. A feed published by the outlet satisfies that directly. An aggregator does not.

## Not available

| Source | Status |
|---|---|
| Shadowserver dashboard API | ❌ `403`. Access requires a request form. Not pursued — `/uae-attack-surface/` is not built. |
| Google News RSS (`hl=en-AE&gl=AE`) | ⚠️ Works, then rate-limits hard: first call 149 KB, subsequent calls 0 bytes. Superseded by the outlet sitemaps above. |
| aeCERT | ⚠️ `aecert.ae` now lives at `https://tdra.gov.ae/en/aecert`, which is reachable. **But its news archive stops in 2018** (2014: 8, 2015: 10, 2016: 18, 2017: 16, 2018: 4, then nothing). Cited as an authority; not consumed as a feed. |
| csc.gov.ae | ❌ TCP 443 opens, then the server resets the TLS handshake (`SSL_ERROR_SYSCALL`). Not reachable from outside the UAE. Cited by name; not consumed. |

## A finding worth remembering

`tdra.gov.ae` — the UAE federal telecom regulator — **appears in the victim dataset**.
Linking to that domain therefore trips the victim-domain guard. The link was removed rather
than allowlisted, and the regulator is cited by name instead. The rule "no victim domain in
the output" is kept absolute on purpose: the first exception is how a control like this dies.

## Reproducing

```bash
npm run fetch:ransomware      # writes src/data/*.json and private/*.raw.json
npm run check:data            # asserts envelope, key allowlist, unknown labels
```
