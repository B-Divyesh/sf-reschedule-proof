# Independent verification 3 — FAIL

**Candidate:** `4308e1220b1d4c1f0ea6bff0b06d4a2d53a559b1`  
**Production URL:** https://reschedule-proof.sociobot.in/  
**Work order:** `reschedule-proof-verify-3`  
**Verified:** 2026-08-28 UTC  
**Verdict:** **FAIL — do not release this candidate.**

The production deployment matches this candidate byte-for-byte and the core
change-card/acknowledgement workflow works. The candidate nevertheless fails
both mandatory entry gates: the required claims manifest is absent, and the
first screen has neither a complete first-read explanation nor a one-click
sample-data demo. The paid checkout is also dead, and an invalid cached license
causes an unbounded owner-screen render loop.

## Mandatory acceptance gates

### FAIL — claims gate

The first repository check, before installation or other inspection, was:

```text
RELEASE_BLOCKER: .factory/claims.json missing
```

There were therefore zero claim tests to run. This is release-blocking under the
work order. Claim-like copy is nevertheless published without manifest entries,
including “No contact upload”, “Works offline”, “Customer contact details never
appear in shared card links”, “Export JSON”, “Export CSV”, and the README's
privacy/offline/export assertions.

### FAIL — cold first-read and demo gate

Fresh browser contexts with service workers blocked were opened at 1440 × 900
and 390 × 844.

- **What it does:** the screen says it creates a private change card, opens SMS
  or email, and keeps an acknowledgement receipt. This part is understandable.
- **For whom:** the screen never says this is for a one-person appointment
  business. The 23-word lead also exceeds the plain-words 22-word hard cap.
- **What to click first:** desktop places “Prepare a change” at y=875, only
  partly inside the 900 px viewport. At 390 px, no action is in the initial
  844 px viewport. Neither screen has “Try it with sample data”.
- Both `/?demo=1` and `/demo` return the ordinary empty owner workspace. They
  have no sample records, demo banner, reset action, isolated namespace, or
  “Start for real” action.
- `.factory/demo.md` and `.factory/copy-audit.md` are absent.

The cold pages returned HTTP 200 and no console/page errors, but they do not meet
the mandatory first-screen shape. Fresh screenshots were captured during the
run as `/tmp/first-read-desktop.png` and `/tmp/first-read-mobile.png`.

## Defects by severity

### P0 — required claims contract is absent

`.factory/claims.json` does not exist, so none of the product's published
offline, privacy, export, or local-storage claims can be executed through the
required clean demo sandbox. This alone makes the candidate unshippable.

### P0 — no one-click sample-data demo and incomplete first screen

There is no demo implementation or documentation. The landing screen omits the
target user and, on mobile, omits every first action from the initial viewport.
This independently fails the explicit work-order gate.

### P1 — invalid or inactive licenses cause an unbounded render loop

A fresh production visit with `?license=qa-invalid-...` correctly made one
verification request, stripped the query token, and cached:

```json
{"valid":false,"reason":"invalid","checkedAt":1787911055354}
```

The owner renderer then became continuously busy. An independent mutation/input
probe did not complete in 30 seconds and its Chromium process had to be
terminated. The code path confirms the cycle: `renderOwner()` always calls
`reconcileLicense()` when a token exists (`src/main.ts:232`), while every false
cached verdict unconditionally calls `renderOwner()` again
(`src/main.ts:467-468`). A user with a rejected, revoked, or expired saved
license can therefore lose practical use of the free tools despite the copy
saying they remain available. The existing browser test only detects the
transient notice and does not assert that the screen becomes stable or accepts
input afterward.

### P1 — advertised $29 checkout is unavailable

The visible `Buy Plus for $29` link targets the required Sociobot URL, but a
fresh request returned HTTP 404 with:

```json
{"error":"enabled factory product","status":404}
```

The checkout did not redirect. The one-time paid product cannot be purchased.

### P2 — required site discovery, metadata, and real 404 are missing

- `/robots.txt` and `/sitemap.xml` return 404.
- `/definitely-not-a-real-route` returns the owner app with HTTP 200; there is no
  designed 404 route.
- Home, Privacy, and Terms omit canonical links, Open Graph metadata, Twitter
  card metadata, and an Apple touch icon. No 1200 × 630 social image ships.
- The standard landing skeleton has no three-step “How it works” section or
  explicit non-goals/privacy section. The header has no site navigation, and
  the footer lacks “Built by Param Factory” and a build/version identifier.

### P2 — mobile Lighthouse performance is not consistently at least 90

Three warning-free Lighthouse 13.4.1 mobile runs against production scored
**89, 97, and 98** Performance (median 97). Accessibility and Best Practices
were 100 in all three. LCP was 1.20–1.34 s and CLS was 0.00275, but TBT varied
from 142 to 435.5 ms. The first run misses the attached ≥90 gate, so the score
is not fully reliable even though bundle and paint budgets pass.

### P3 — two small mobile target measurements miss 44 px

At 390 px the revealed skip link measured 176.97 × 42 px and the Terms footer
link measured 43.6 × 44 px. Radio inputs themselves measured 29.6 × 48 px, but
their visible label surfaces are 44 px high. This did not produce an Axe
violation or keyboard failure, but the first two measurements miss the literal
44 × 44 target baseline.

## Repository gates

Executed from the clean candidate checkout with Node 22 and the pinned
Playwright 1.58.2:

```bash
npm ci
npm audit
npm audit --omit=dev
npm test
npx tsc --noEmit
npm run build
npm run test:e2e
```

- Install and both dependency audits passed with 0 vulnerabilities.
- Vitest: **12/12 passed** across 2 files.
- TypeScript: passed with no diagnostics. There is no lint script.
- Exact production build passed and produced `dist/`.
- Playwright: **20/20 passed** across desktop Chromium and 390 × 844 mobile.
- Package/consumer installation is not applicable to this private static PWA.

## Independent functional exercise

The production core flow passed in a fresh browser profile:

1. Created a rescheduled “QA piano lesson” change.
2. Verified an addressed `sms:+15551234567?...` composer URI and activated it.
3. Confirmed the notification-attempt status was logged.
4. Opened the customer card, acknowledged it, returned the token-matched
   receipt, and added it to the originating local record.
5. Reloaded and observed `✓ Confirmed`.
6. Exported CSV with one header and one data row, and JSON with one acknowledged
   record.

The card payload contained appointment/customer-first-name/change/return data
but no `customerPhone` or `customerEmail` keys. No third-party HTTP(S) request
occurred during the flow; the only non-HTTP scheme observed was the intentional
`sms:` composer handoff. There were zero console or page errors.

Additional production cases passed:

- 7-digit and 15-digit phone boundaries were accepted.
- 6-digit customer and 16-digit return phones were rejected with specific
  errors and no record write.
- Malformed email, identical old/new times, and past expiry were rejected
  without a record write.
- Cancellation hid and disabled New time, created successfully at 390 px, and
  rendered a cancellation summary with no horizontal overflow.
- A malformed `.ics` file gave a useful error; a subsequent valid event
  populated “Guitar tune-up”.
- The verifier's malformed structured backup was rejected before confirmation;
  the existing “Backup survivor” record remained after reload.
- A genuine receipt arriving after the local card expiry rendered “This
  confirmation card has expired” and exposed no import button.

## Accessibility, responsive behavior, and browser quality

- `/opt/fleet/lib/verify-url.sh` passed production: HTTP 200, title, `lang=en`,
  one `h1`, `main`, image alt, named buttons, 798 ms measured load, and zero
  console/page errors.
- Independent Axe 4.10.2 scans found **0 serious/critical and 0 total
  violations** on owner, customer-card, Privacy, and Terms pages at both desktop
  and 390 px.
- Keyboard smoke passed: the skip link was first, Enter moved focus to `main`,
  and the focused skip link used a 3 px vermilion outline. Form controls were
  reachable without a keyboard trap.
- All audited pages had one `h1`, one `main`, and no horizontal overflow at
  390 px. Setting the root text size to 200% retained a 390 px document width.
- `prefers-reduced-motion: reduce` changed scroll behavior to `auto` and reduced
  the maximum transition duration to 0.01 ms.

## Privacy, response policy, PWA, and performance

- Initial and full-workflow HTTP(S) traffic was first-party only. There are no
  runtime third-party fonts/scripts, analytics, or trackers. License checks use
  only the expected Sociobot API. URL fragments were not sent in HTTP requests.
- Production has CSP with `frame-ancestors 'none'`, HSTS, COOP same-origin,
  `X-Frame-Options: DENY`, `nosniff`, strict-origin referrer policy, and a
  restrictive Permissions-Policy. The manifest MIME is correct.
- Hashed JS/CSS return `public, max-age=31536000, immutable`; `sw.js` returns
  `no-cache`; the manifest returns a one-hour cache policy.
- A fresh serial rate-limit probe accepted requests 1–30 and returned HTTP 429
  on request **31** with `Retry-After: 4`. This gate now passes.
- Chromium reported no manifest errors. It found standalone display, versioned
  start URL, and 192/512/maskable icons.
- A local record survived reload and tab close. After service-worker control,
  the record remained visible during an offline reload and the UI said
  `OFFLINE READY`.
- A controlled service-worker byte-change simulation installed a new worker and
  displayed `An update is ready. Reload to use it.`
- Initial app JS is 35,914 bytes / 11,685 gzip; CSS is 16,047 bytes / 4,310
  gzip. The responsive mobile hero is 26,334 bytes and the largest hero is
  77,450 bytes. All bundle/image budgets pass.
- The visual system is product-specific, the single light treatment is
  justified in `.factory/design.md`, and the original generated hero has prompt
  and provenance records.

## Deployment identity

Local and production files matched byte-for-byte:

- `app-BhEwXpFP.js` —
  `c2d2d1ad708a7c0c80f011741584e560cffd7054a721f4b1d4205cf7e767ee4e`
- `app-DeGVPuP3.css` —
  `7e93e0bc5323cc743f4a01b5f352bb0d37b8a27046feb689cd2ce23f0ac1ab0d`
- `sw.js` —
  `94075c80ec5cab40cada8d71ddd69a4c4cb13a5db101eade18e457b3859f154b`
- `manifest.webmanifest` —
  `a841b700de05cf32ecb67163fb357e38741dccd922b47179b186a953ed95517a`
- `index.html`, Privacy HTML, and Terms HTML also matched exactly.

The product is a static PWA with no sign-in, product backend, server persistence,
health endpoint, or server concurrency boundary. Entra and backend-only checks
are not applicable. The Sociobot billing endpoints were checked as described
above.

## Required before re-verification

1. Add `.factory/claims.json` and one observable demo-sandbox test for every
   published claim; remove any claim that cannot be tested.
2. Add the required one-click sample demo, isolated demo storage, banner/reset/
   start-real controls, direct demo URL, and `.factory/demo.md`.
3. Make the first viewport identify the one-person appointment business and
   expose the primary action on 390 px; complete `.factory/copy-audit.md`.
4. Stop invalid-verdict reconciliation after the UI is updated; add a stability
   regression that types into and submits the free form after an invalid cached
   license.
5. Register/enable the Sociobot product so the live checkout redirects instead
   of returning 404.
6. Add the required metadata, discovery files, real 404, consistent navigation/
   footer/build identity, and stabilize mobile Lighthouse at ≥90.
