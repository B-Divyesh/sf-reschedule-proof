# Independent verification 2 — FAIL

**Candidate:** `3454aec2cedc0f31b595d74b866b1886d2ee7c5c`  
**Production URL:** https://reschedule-proof.sociobot.in/  
**Work order:** `reschedule-proof-verify-2`  
**Verified:** 2026-08-28 UTC  
**Verdict:** **FAIL — do not release this candidate.**

This was a fresh, independent run from a clean candidate checkout. The live
application matches the candidate's production build byte-for-byte and the core
reschedule/acknowledgement path works, but an invalid backup can destroy the
local proof log and the product's billing verification endpoint has no observed
burst rate limit. Both violate explicit acceptance requirements.

## Blocking defects

### P1 — malformed JSON import replaces valid records, then bricks the local log

The import path validates only `version === 1` and that `records` is an array.
It calls `replaceRecords()` before validating individual records or proving that
the replacement can render. This is destructive and not transactional with the
application-level validation/render step.

Fresh production reproduction in an isolated browser profile:

1. Create a valid change named **Record that must survive** and confirm one
   record exists in IndexedDB.
2. Import this syntactically valid file and accept the replacement prompt:

   ```json
   {"version":1,"records":[{"id":"malformed-record"}]}
   ```

3. The UI reports **“That file is not a valid Move Confirmed backup.”**
4. IndexedDB nevertheless contains only `{ "id": "malformed-record" }`; the
   valid record is gone.
5. Reloading renders **“Your local log could not open.”** The normal log,
   deletion, import, and export controls are unavailable.

This violates invalid-input recovery, local-first data ownership, and the core
auditable-proof job. A damaged or wrong JSON file can irreversibly remove the
user's current proof trail even though the product says it rejected the file.

### P1 — product-unlock verification did not rate-limit a 200-request burst

The product has a server-side unlock dependency at:

`GET https://api.sociobot.in/api/v1/products/reschedule-proof/verify?license=...`

A fresh burst in batches of ten stopped only at the test cap: **200/200 responses
were HTTP 200**, **0 were HTTP 429**, and no `Retry-After` threshold was observed.
The first 429 threshold is therefore **not observed through 200 rapid requests**.
This directly fails the work order's mandatory API rate-limit check.

## Other defects

### P2 — invalid returned licenses retain a misleading pending-verification notice

Opening `/?license=qa-invalid-return-token` correctly strips the token from the
URL, stores it, and makes one verification request. The API returns
`{ valid:false, reason:"invalid" }` and the false verdict is cached, but the
persistent UI continues to say **“A saved license needs verification.”** It does
not show the required quiet “license no longer active” notice. The buy link and
free workflow remain available.

### P2 — repeated mobile Lighthouse performance did not reliably meet 90

Three Lighthouse 13.0.1 mobile runs had no run warnings and scored **80, 88,
and 94** for Performance (median **88**), with TBT **893, 486, and 297 ms**.
Accessibility and Best Practices were 100 in all three; LCP was 1.21–1.41 s and
CLS 0–0.003. Bundle and visual-loading budgets pass, but the repeated score does
not reliably meet the attached ≥90 performance gate.

## Build and repository checks

Run from the clean checkout with Node 22.23.2 and npm 10.9.8:

```bash
npm ci
npm audit
npm audit --omit=dev
npm test
npx tsc --noEmit
npm run build
npm run test:e2e
```

- Clean install: 61 packages; full and production audits found 0 vulnerabilities.
- Vitest: **9/9 passed** across two files.
- TypeScript: passed with no diagnostics. There is no separate lint script.
- Exact production build: passed and produced `dist/`.
- Playwright 1.58.2: **16/16 passed** across desktop Chromium and 390 × 844.
- Built initial assets: JS 33.90 KB (11.24 KB gzip), CSS 15.95 KB
  (4.26 KB gzip); largest image 77.45 KB. All static budgets pass.
- Package/consumer checks are not applicable to this private static PWA.

## Independent end-to-end and recovery evidence

- Desktop normal path passed: create reschedule, validate normalized SMS and
  email composer URIs, log a copy attempt, reload persistent IndexedDB state,
  open the private card, create a customer receipt, import the matching receipt,
  and export the acknowledged record as JSON.
- A delayed genuine receipt was independently rejected after the originating
  local record expired; no acknowledgement-import button was present.
- Cancellation passed at 390 px using boundary-valid 7-digit and 15-digit phone
  values. The new-time field was hidden and not required. A 16-digit phone was
  rejected without card creation.
- Recovery passed for blank required fields, missing customer contact, missing
  return contact, identical old/new time, past expiry, malformed `.ics`, malformed
  card, and malformed receipt. A valid `.ics` recovered after the bad file.
- The blocking structured-backup case above is the exception: it reports an
  error only after destroying the current record set.

## Accessibility, responsive behavior, and browser quality

- Axe 4.10.2 found **0 serious/critical** issues on the owner page, customer
  card, Privacy page, and Terms page.
- `/opt/fleet/lib/verify-url.sh` passed production: HTTP 200, correct title and
  `lang`, one `h1`, `main`, no missing image alt, no unnamed button, and zero
  console/page errors. Measured load was 943 ms in that smoke run.
- Keyboard smoke passed: the skip link is first, Enter focuses `main`, and the
  visible focus ring is 3 px vermilion (`rgb(185, 55, 36)`).
- At 390 × 844, document width equaled viewport width (390 px), body text was
  16 px, and no horizontal overflow was present. Desktop and mobile screenshots
  were visually inspected; task hierarchy and controls remained legible.
- With `prefers-reduced-motion: reduce`, transitions computed to 0.01 ms.
- Independent normal and error-path runs produced zero console or page errors.

## Privacy, network, PWA, and deployment evidence

- Initial browser traffic used only `https://reschedule-proof.sociobot.in`.
  There are no analytics, third-party scripts/fonts, or automatic contact-data
  requests. Shared card payloads excluded customer phone and email; URL fragments
  were not present in network requests.
- License return handling stripped `license` from the visible URL and verified
  only against the expected Sociobot production API. The cached false verdict
  prevented a second verification request on reload.
- Service-worker control and cached offline reload passed on production at
  390 px. A controlled byte-change test against the exact local build preserved
  control and displayed **“An update is ready. Reload to use it.”**
- Manifest fields, standalone display, versioned start URL, 192/512 icons, and
  512 maskable icon are present. Icon dimensions were independently checked.
- Live `/`, `/privacy/`, `/terms/`, manifest, worker, JS, and CSS returned 200.
  Responses include CSP with `frame-ancestors 'none'`, `X-Frame-Options: DENY`,
  COOP, HSTS, `nosniff`, Referrer-Policy, and Permissions-Policy.
- Hashed JS/CSS use `public, max-age=31536000, immutable`; `sw.js` uses
  `no-cache`; the manifest is `application/manifest+json`.

## Deployment identity

Local candidate build and production hashes matched exactly:

- `app-3l0kob6R.js`:
  `49b9c72fd29ba1a78f94a796749cd825c27cbfea5ae2655fcbdcc2a44e3749f5`
- `app-CCKNEVIM.css`:
  `313631b7b379e7f696aab7ad2661b1ae3cf8c03c7bd6756fb2be73d8189c752f`
- `sw.js`:
  `4d70b36253f62341e8832458f6c19468d0167f3e63191a8d77814a569778e327`
- `manifest.webmanifest`:
  `2db6b61e861c70e0764e0e13ea40bb9223c6608a4282685f11076c085b0e5f1d`
- Privacy and Terms HTML also matched the local `dist/` files exactly.

The product is static and has no sign-in, product backend, server persistence,
or health endpoint; Entra authority and backend concurrency checks are not
applicable. The Sociobot unlock endpoint is the only server-side dependency in
scope and fails its required rate-limit check as documented above.

## Required before re-verification

1. Validate every imported record and stage the full backup before changing
   IndexedDB; commit the replacement only after validation succeeds. Add tests
   proving malformed records preserve the existing log and that recovery remains
   available after a bad import.
2. Add/enforce burst rate limiting on the production verify endpoint so a finite
   threshold returns 429 with a valid `Retry-After` header.
3. Persistently render the invalid/revoked license state instead of leaving the
   stale “needs verification” copy.
4. Recheck mobile performance under a repeatable throttled runner and make the
   ≥90 result reliable.
