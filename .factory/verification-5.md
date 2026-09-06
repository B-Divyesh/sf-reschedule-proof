# Repair verification 5 — release blocker remains external

**Implementation:** `1cac54e64b566487ce2f276167f10b22f3eea464`  
**Production URL:** https://reschedule-proof.sociobot.in/  
**Work order:** `reschedule-proof-repair-4`  
**Verified:** 2026-09-06 UTC  
**Verdict:** **BLOCKED — the central Plus catalog entry is still absent.**

## Checkout finding

The production Plus action uses the mandated Sociobot checkout endpoint. A
fresh direct request after the final deployment returned:

```text
GET https://api.sociobot.in/api/v1/products/reschedule-proof/checkout
HTTP/2 404
{"error":"enabled factory product","status":404}
```

The static client is not able to create the required central billing product,
and replacing this with a payment-provider or mock flow would violate the paid
unlock contract. The exact one-time offer metadata is ready for the separate
billing-registration operator at `/work/.evidence/billing-offer.json`.

## Product checks that pass

- Clean `npm ci`, `npm audit`, and `npm audit --omit=dev` completed with zero
  vulnerabilities. `npm test` passed 15/15; typecheck, lint, and build passed.
- All nine exact commands declared in `.factory/claims.json` passed separately
  on desktop and 390 × 844 mobile Chromium. The complete suite passed 44/44.
- Live desktop and fresh-phone first reads identified the job as making
  appointment changes clear and confirmed, named one-person appointment
  businesses, and kept **Try it with sample data** in the first viewport.
- The live demo entered in one click, showed piano lesson, bike service pickup,
  and dog grooming, retained its persistent sample label, reset from two records
  to three, and did not add a record to the real database.
- `verify-url.sh` passed live with HTTP 200, correct title/lang/h1/main/alt
  structure, no console errors, and a 754 ms load. Live Axe scans of Home,
  Demo, Privacy, Terms, and 404 at desktop and mobile sizes had zero violations.
- The final PWA uses `move-confirmed-v5` with manifest start URL `/?v=5`.
  A fresh service-worker-controlled mobile demo reloaded offline with the
  sample and **Offline ready** visible.
- The live response has CSP with frame denial, COOP, nosniff, strict referrer
  policy, restrictive permissions, immutable assets, and a no-cache worker.
  An unknown route returns HTTP 404 and the revised recovery page.
- Lighthouse 13.4.1 mobile: Performance 100, Accessibility 100, LCP 1.14 s,
  CLS 0, TBT 0 ms.
- The billing verification endpoint still provides its required allowance:
  a final serial probe first received HTTP 429 on request 31 with
  `Retry-After: 3`.

## Earlier findings

All previous product-owned findings remain covered by current regression tests:
expiry validation, phone validation, cancellation field visibility, safe backup
replacement, inactive-license stability, claims/demo isolation, route metadata,
and 44 px keyboard targets. Repair 4 also removed the remaining metaphorical
404 and utility labels and bumped the PWA shell so the changes reach installed
clients.

## Deployment identity

The final deployed JS matches local build SHA-256:

```text
assets/app-CtC1JWA8.js  1fb824cb96412ce47cdb5bfa25cdaff1fb3b2744f8449fed79ab056eeb48e349
sw.js                   d82502f0bd7c47dcb30d47a68b047b52edb394543cab4dc86636d3cdf1da737f
manifest.webmanifest    fef0d4ed3a590bfb3ad9c9f9cb3f3fd6c3e3dffc082dadb0f5b80abdc2937802
```

No deployment wrapper failure occurred: both uploads completed successfully to
the existing Central US product app and HTTPS returned 200 afterward.
