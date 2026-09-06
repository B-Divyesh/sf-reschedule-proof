# Move Confirmed repair handoff

> ## Current release status: **BLOCKED by central billing registration**
>
> The deployed PWA and all product-owned checks pass. The advertised Plus
> checkout still cannot start because the mandated central endpoint returns
> HTTP 404. The registration metadata required by the separate billing operator
> is ready at `/work/.evidence/billing-offer.json`.

## Job, audience, and first action

Move Confirmed creates a private change card and records a returned customer
acknowledgement. It is for one-person appointment businesses. On the first
screen, select **Try it with sample data** to open three realistic changes in a
separate demo log.

## Implementation and deployment

- Implementation SHA: `1cac54e64b566487ce2f276167f10b22f3eea464`
  (`fe012d263d782f4bc7e698b63c1f14e9f1dcf729` contains the visible copy and
  404 recovery changes; `1cac54e` advances the PWA shell to v5).
- Previous report-only documentation SHA: `7b8e5e5175c75f4effce666d47e8a84622e70c2b`.
- Deployment: existing `sf-reschedule-proof` Azure Static Web App in
  `centralus`, deployed twice successfully with its existing configuration and
  `https://reschedule-proof.sociobot.in` ready over HTTPS.
- Live build identity: app JS `app-CtC1JWA8.js`, SHA-256
  `1fb824cb96412ce47cdb5bfa25cdaff1fb3b2744f8449fed79ab056eeb48e349`;
  worker SHA-256 `d82502f0bd7c47dcb30d47a68b047b52edb394543cab4dc86636d3cdf1da737f`;
  manifest SHA-256 `fef0d4ed3a590bfb3ad9c9f9cb3f3fd6c3e3dffc082dadb0f5b80abdc2937802`.

## Completed in repair 4

1. Replaced remaining transit-metaphor and mood language with direct task
   language. The missing-page screen now says what happened and returns to the
   app; its browser regression checks the recovery path rather than source text.
2. Added `.factory/catalog-description.txt`: “Create private proof cards for
   changed appointments.” It is verb-first, plain, 52 characters, and copied
   unchanged to `/work/.evidence/catalog-description.txt`.
3. Prepared `/work/.evidence/billing-offer.json` for the billing-registration
   operator: the real slug, **Move Confirmed Plus**, 2900 USD minor units,
   `one_time_price`, exact production return URL, paid features, price evidence,
   and product license-verification path. It contains no credentials.
4. Advanced the service-worker cache from v4 to v5 and matched the manifest
   start URL (`/?v=5`). This ensures installed clients obtain the changed shell
   rather than retaining the prior v4 cache.

## Earlier findings and current disposition

| Earlier finding | Current disposition |
| --- | --- |
| Expired cards accepted a receipt | Fixed; delayed and hand-crafted expired receipts are rejected in unit and browser tests. |
| Invalid phone text could log a handoff | Fixed; 7–15 digit recipient validation rejects invalid values before a record is written. |
| Cancellation displayed New time | Fixed and browser-tested as hidden and not required. |
| Immutable caching, CSP, framing, COOP, manifest MIME | Fixed; live headers and cache policies are present. |
| Invalid backup could replace real proof | Fixed; validation occurs before the replacement confirmation and tests prove the old record remains. |
| Inactive license rendered indefinitely | Fixed; the false-verdict state is stable and the free form remains usable. |
| Claims, sample demo, first-screen explanation, metadata, 404, targets | Fixed; all nine declared claims and the 44-test browser suite pass. |
| Billing verify endpoint lacked a burst limit | Fixed centrally; final probe first returned 429 on request 31 with `Retry-After: 3`. |
| Plus checkout returned 404 | **Still blocked externally.** The client link is the mandated endpoint, but the central billing catalog has no enabled product entry. |

## Verification

From a clean install with Node 22 and Playwright 1.58.2:

```bash
npm ci
npm audit
npm audit --omit=dev
npm test
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

- Clean install and both audits: 0 vulnerabilities.
- `npm test`: 15/15 passed. Typecheck, lint, and production build passed.
- Each of the nine exact commands in `.factory/claims.json` was run separately
  against the final v5 build; each passed in desktop and 390 × 844 mobile
  Chromium.
- Full Playwright suite: 44/44 passed.
- Built initial app JS is 41.83 KB / 13.51 KB gzip; CSS is 19.02 KB / 4.85 KB
  gzip. The largest hero is 77.45 KB and the mobile hero is 26.33 KB.
- Final live `verify-url.sh` check passed: HTTPS 200, title/lang, one h1/main,
  image alt text, named buttons, zero console/page errors, 754 ms load.
- Fresh live desktop and mobile contexts confirmed the job, audience, and
  first action before scrolling. Both entered `/demo`, displayed piano lesson,
  bike service pickup, and dog grooming, kept the demo banner visible, reset
  from two records to three, and left the real database at zero records.
- Live Axe scans on Home, Demo, Privacy, Terms, and 404 found zero violations
  at both viewport sizes. Unknown routes return HTTP 404 with the designed
  recovery page.
- A fresh mobile browser was controlled by `move-confirmed-v5`, then reloaded
  the populated demo offline with **Offline ready** and no errors.
- Lighthouse 13.4.1 mobile on the final live build: Performance **100**,
  Accessibility **100**, LCP **1.14 s**, CLS **0**, TBT **0 ms**.

## Remaining blocker and next step

`GET https://api.sociobot.in/api/v1/products/reschedule-proof/checkout` still
returns HTTP 404 with `{"error":"enabled factory product","status":404}`.
This is outside the static product repository and cannot be corrected by a
client-side fallback without inventing a payment flow. The billing operator
must register and enable the one-time offer in
`/work/.evidence/billing-offer.json` with return URL
`https://reschedule-proof.sociobot.in/`. Then repeat the checkout redirect and
license-return/verification path before release. The free local-first workflow,
exports, and acknowledgement safety behavior remain available.
