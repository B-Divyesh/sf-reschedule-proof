# Verify appointment-change proof — FAIL

**Verdict:** **FAIL**

**Findings:** **5**

**Untested public claims:** **2**

**Implementation reviewed:** `1cac54e64b566487ce2f276167f10b22f3eea464`

**Documentation head reviewed:** `997593ad4856f83b68331937ee24707a794fe57f`

**Live URL:** https://reschedule-proof.sociobot.in/

**Work order:** `reschedule-proof-verify-5`

**Verified:** 2026-09-06 UTC

Move Confirmed creates a private card for a changed appointment and keeps the
returned customer acknowledgement in a local log. It is for one-person
appointment businesses. Before scrolling on fresh desktop and phone pages, the
first action is **Try it with sample data**.

The free workflow, demo, local storage, accessibility, offline reload, update
notice, response policy, and performance pass. The live paid purchase cannot
start, two public billing claims lack complete claim tests, and two recovery
pages do not fully meet the stated words and site-structure contracts. The
required billing-registration evidence file is also absent.

## Findings

### P1 — Plus checkout returns HTTP 404

The visible **Buy Plus for $29** link uses the required Sociobot endpoint, but
the live request does not redirect to hosted checkout:

```text
GET https://api.sociobot.in/api/v1/products/reschedule-proof/checkout
HTTP 404
{"error":"enabled factory product","status":404}
```

A buyer cannot obtain Plus. This makes the published paid path unavailable.
The client correctly avoids an embedded payment provider; registration of the
central one-time offer is an external billing action, not a product-code fix.

### P1 — the billing operator's required offer file is absent

`/work/.evidence/billing-offer.json` did not exist at the start of this fresh
verification and remains absent. The work order says the billing operator must
use that file, while the current handoff says it is ready there. The claimed
`/work/.evidence/catalog-description.txt` copy is also absent, although the
catalog text remains recoverable from `.factory/catalog-description.txt`.

The checkout cannot be registered from the promised evidence handoff until the
offer file is restored with the approved schema. This is an evidence/handoff
defect, not a reason to change the static client.

### P2 — two public billing claims lack complete claim coverage

The nine declared claim commands all pass, but the inventory and its tests do
not cover two statements a visitor can rely on:

1. **“One payment enables Plus on your devices.”** The `plus-once` command
   checks price copy and saves settings in the demo-only Plus preview. It never
   starts checkout, accepts a returned license, verifies it, or proves access
   on another device. The live checkout currently fails as described above.
2. The Privacy page says the app sends **only the license token** to verification
   **at most once daily under normal use**. No entry in `.factory/claims.json`
   names or tests the request contents and 24-hour boundary. An untagged
   invalid-license regression checks only one immediate reload.

These count as **2 untested public claims**. They must be listed with complete
observable tests, or narrowed/removed from public copy.

### P2 — the offline recovery page uses indirect words and omits the site shell

The shipped and precached `/offline.html` page is live at HTTP 200, but it says
**“The line is offline”** and **“Open the local workbench.”** Those are the
transit and workshop metaphors the current repair says it removed. Direct task
words would say that the browser is offline and tell the user to open saved
appointment changes or reconnect.

The page has `lang`, a title, one `h1`, one `main`, a visible link, and zero Axe
violations. It nevertheless lacks the required skip link, header, navigation,
footer, description, canonical link, Open Graph data, and Twitter card data.

### P3 — the 404 page lacks required social metadata

An unknown URL correctly returns HTTP 404 with the designed page, direct
wording, one `h1`, the standard landmarks, and a working return link. The
dedicated `/404/` document has a description and canonical link, but it has no
Open Graph or Twitter card metadata. The site-structure contract requires that
metadata on every route. The existing metadata unit test checks only Home,
Privacy, and Terms, so it does not catch this gap.

## Declared claim commands

The following exact commands were run separately after `npm ci` in a fresh
clone at documentation head `997593a`. Each ran its one tagged test in desktop
Chromium and the 390 × 844 mobile project; all **18/18 executions passed**.
Passing Playwright tests do not emit traces. Terminal output is retained in the
worker evidence log.

| Claim | Result |
| --- | --- |
| `@claim:demo-sandbox` | PASS — 2/2 |
| `@claim:proof-roundtrip` | PASS — 2/2 |
| `@claim:contact-privacy` | PASS — 2/2 |
| `@claim:offline-reload` | PASS — 2/2 |
| `@claim:export-formats` | PASS — 2/2 |
| `@claim:calendar-import` | PASS — 2/2 |
| `@claim:backup-import` | PASS — 2/2 |
| `@claim:expiring-links` | PASS — 2/2 |
| `@claim:plus-once` | PASS — 2/2, but incomplete for the live paid path |

The complete local browser suite passed **44/44**. The gap in the last row is a
claim-coverage finding even though its present demo assertions pass.

## Clean repository checks

Run from a fresh clone with Node 22 and Playwright 1.58.2:

```text
npm ci                 PASS; 61 packages, 0 vulnerabilities
npm audit              PASS; 0 vulnerabilities
npm audit --omit=dev   PASS; 0 vulnerabilities
npm test               PASS; 15/15
npm run typecheck      PASS
npm run lint           PASS
npm run build          PASS; dist/ created
npm run test:e2e       PASS; 44/44
```

Built initial assets remain within budget:

- JavaScript: 41.83 KB, 13.41 KB gzip.
- CSS: 19.02 KB, 4.86 KB gzip.
- Mobile hero: 26.33 KB; largest hero: 77.45 KB.
- Manifest: standalone, `/?v=5`, 192/512 icons, and a 512 maskable icon.

## Live desktop, phone, and demo checks

- Fresh 1440 × 900 and 390 × 844 pages put the job, audience, primary action,
  result of that action, and three facts in the first viewport. There was no
  horizontal overflow or console/page error.
- One click opened `/demo` with piano lesson, bike service pickup, and dog
  grooming records. The banner remained visible on the sample card. Deleting
  one record changed the count from three to two; **Reset demo** restored three.
  **Start for real** deleted the demo database and the real database contained
  zero records.
- The sample bike card completed the customer acknowledgement round trip and
  persisted as Confirmed. The normal real-workspace card flow also passed.
- Invalid phones, missing contacts, identical times, expired links and
  receipts, malformed calendar input, malformed backup data, cancellation,
  valid 7- and 15-digit phone boundaries, export, and inactive-license recovery
  passed. The failed backup left the prior record usable after reload.
- A broad live run passed 26 of 28 cases on its first attempt. One Chromium
  process crashed during a mobile offline context, and one record assertion
  missed its initial render window. Both exact cases passed immediately when
  rerun alone; no product error or retained trace reproduced.

Evidence is under `/work/.evidence/verify5-live/`, including first-screen,
demo, 404, and offline screenshots plus `live-audit.json`.

## Accessibility, privacy, PWA, and performance

- `verify-url.sh` passed live in 650 ms: HTTP 200, title, `lang=en`, one `h1`,
  `main`, image alternatives, named buttons, and zero errors.
- Playwright Axe found zero violations on Home, Demo, Privacy, Terms, and 404 at
  desktop and phone sizes. A separate Axe run found zero violations on the
  offline document. Its contract omissions are listed above.
- Keyboard Tab focused the skip link with a 3 px vermilion outline; Enter moved
  focus to `main`. Visible controls passed the 44 px target checks. The visually
  hidden file inputs use 44 px or larger labelled controls.
- At 200% root text size, the 390 px page had no horizontal overflow. Reduced
  motion reduced the maximum animation or transition duration to 0.01 ms.
- Demo traffic used only `https://reschedule-proof.sociobot.in`. Shared card
  payloads contained no customer phone or email. An invalid live license used
  only the Sociobot API, was removed from the address bar, showed a stable
  inactive notice, and was not rechecked on immediate reload.
- A fresh service-worker-controlled phone demo reloaded offline with the sample
  log and **Offline ready**. A controlled byte and cache-version change against
  the exact build displayed **An update is ready. Reload to use it.**
- Lighthouse 13.4.1 live mobile results: Performance **100**, Accessibility
  **100**, Best Practices **100**, SEO **100**, LCP **1.146 s**, CLS **0.00275**,
  TBT **40.5 ms**. Evidence: `/work/.evidence/verify5-live/lighthouse.json`.

## Routes, links, response policy, and billing allowance

- `/`, `/demo`, `/privacy/`, `/terms/`, `/404/`, `robots.txt`, `sitemap.xml`,
  the manifest, and the worker return 200. An unknown path returns the designed
  page with HTTP 404. This deliberate 404 is correct and is not a defect.
- Route titles are correct for Home, Demo, Privacy, Terms, 404, customer cards,
  and acknowledgement receipts. `/demo`, `/?demo=1`, address-bar reload, and
  recovery links work.
- Every rendered HTTP link returned 200 except the Plus checkout described in
  finding 1. The external source link returned 200.
- Live headers include CSP with `frame-ancestors 'none'`, HSTS, COOP, frame
  denial, `nosniff`, strict referrer policy, and restrictive permissions.
  Hashed assets use one-year immutable caching; `sw.js` uses `no-cache`; the
  manifest MIME type is correct.
- The billing verification allowance passed: a serial invalid-token probe first
  returned HTTP 429 on request **31** with `Retry-After: 3`.
- This is a static PWA with no product backend, tenants, sign-in, server data,
  health route, restart persistence, or server concurrency boundary. Those
  backend checks are not applicable. Browser state is local by design.

## Earlier findings and current disposition

| Earlier finding | Current disposition |
| --- | --- |
| Expired cards accepted receipts | PASS — delayed and hand-crafted receipts are rejected. |
| Invalid phone text logged a handoff | PASS — malformed values do not create a record. |
| Cancellation showed New time | PASS — hidden and not required. |
| Weak cache/security headers and manifest MIME | PASS live. |
| Invalid backup replaced valid proof | PASS — validation occurs before confirmation and replacement. |
| Inactive license caused repeated rendering | PASS — stable live notice and usable free form. |
| Missing claim file, demo, first-screen explanation | PASS for declared claims and demo; new claim-inventory gap is finding 3. |
| Missing routes, discovery, metadata, 404, footer, targets | Mostly PASS; recovery-page gaps are findings 4 and 5. |
| Billing verify endpoint lacked 429/Retry-After | PASS — request 31 returned 429 with `Retry-After: 3`. |
| Indirect 404 and utility wording | 404 PASS; offline fallback remains indirect in finding 4. |
| Installed clients retained the old shell | PASS — v5 worker and manifest match; update notice works. |
| Plus checkout returned 404 | OPEN — finding 1. |

## Deployment identity

The live files match the clean local build byte-for-byte. Later commits after
`1cac54e` change documentation only, so they do not require a different product
image.

| File | SHA-256 |
| --- | --- |
| `assets/app-CtC1JWA8.js` | `1fb824cb96412ce47cdb5bfa25cdaff1fb3b2744f8449fed79ab056eeb48e349` |
| `assets/app-DKWHTq91.css` | `67e75687a69be506642e4cbdf9e141b2f6408478d7da805a6e4e6c4f86a612b1` |
| `sw.js` | `d82502f0bd7c47cdb30d47a68b047b52edb394543cab4dc86636d3cdf1da737f` |
| `manifest.webmanifest` | `fef0d4ed3a590bfb3ad9c9f9cb3f3fd6c3e3dffc082dadb0f5b80abdc2937802` |
| `index.html` | `fa603c490435fd50215ec0032be65a9ad0725e39fdc37e10614c74b1e1b6f6bf` |
| `404/index.html` | `3b792a8d63a69bb652f121f8ba06521f4a5cbffe4f3c17312ef3cce4c8564750` |

## Required next actions

1. Restore the approved `/work/.evidence/billing-offer.json` and have the
   billing operator register the one-time offer. Recheck checkout redirect,
   license return, verification, restore, and cross-device use.
2. Add complete declared claim tests for paid acquisition/license return and
   the license-token request/frequency statement, or narrow the public copy.
3. Replace the offline page's indirect terms and give it the standard shell and
   metadata. Add 404 Open Graph and Twitter metadata and test both documents.
4. Re-run every claim command and this live review. PASS requires zero findings
   and zero untested claims.
