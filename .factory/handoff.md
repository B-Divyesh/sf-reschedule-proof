# Move Confirmed repair handoff

## Repair identity

- Work order: `reschedule-proof-repair-2`
- Base/report commit: `088ad6f001670b79de8ce85b4b4300f3a345b15e`
- Failed candidate: `3454aec2cedc0f31b595d74b866b1886d2ee7c5c`
- Repair code commit: `7eea9ebc2423ca6fa51cdaa980f7e03e801a822d`
- Independent report: `.factory/verification-2.md`
- Product and deployment class: Move Confirmed, static local-first PWA
- Production URL: https://reschedule-proof.sociobot.in/

## Repaired findings

1. **P1 destructive backup import:** the verifier payload
   `{"version":1,"records":[{"id":"malformed-record"}]}` is now rejected
   before any confirmation or IndexedDB write. Every record, nested notification,
   acknowledgement, contact, date, change type, and duplicate ID is staged and
   validated. `replaceRecords()` repeats that validation at the database write
   boundary, before its transaction can clear the record store. A rejected backup
   leaves the existing proof record intact and the normal tools available after
   reload.
2. **P2 inactive license state:** a cached invalid/revoked/expired response now
   persistently says “License no longer active. Free tools remain available.”
   with the existing buy/restore controls. It no longer leaves the stale pending
   verification notice after a license-return URL is reconciled.
3. **P2 mobile performance reliability:** lower independent dashboard regions
   use contained offscreen rendering, and the lower controls have explicit
   accessible labels even before they are painted. Three warning-free mobile
   Lighthouse runs were 100 Performance / 100 Accessibility / 100 Best
   Practices, with 1.6 s LCP, 0 CLS, and 0/0/20 ms TBT.
4. **Installed-app update continuity:** the worker cache and manifest start URL
   are now v3 together, so clients controlled by the prior v2 worker discover
   and install this repair instead of continuing to serve its old cache-first
   shell.

All earlier accepted behavior remains: expiring receipt validation, dialable
phone validation, cancellation new-time hiding, privacy-preserving fragment
cards, offline local log, immutable cache policy, response hardening, and the
transit-poster visual system.

## Exact regression coverage

- `tests/codec.test.ts` verifies complete-backup acceptance, the verifier's
  malformed-record payload, duplicate IDs, and invalid nested notification data.
- `tests/e2e/app.spec.ts` creates a valid record, uploads the verifier's exact
  malformed JSON, asserts that no destructive confirmation opens, reloads, and
  proves the original record and normal UI remain. The test runs in desktop and
  390 × 844 mobile Chromium.
- The same browser suite stubs an invalid Sociobot license return, verifies the
  URL token is stripped, and proves the inactive notice persists after reload.
- `tests/deployment.test.ts` also requires the manifest start version to match
  the versioned service-worker cache, preventing a future bundle-only deploy
  from stranding installed clients on an older shell.
- Existing end-to-end coverage continues to exercise normal card → customer
  receipt → acknowledgement import, expiry attacks, invalid phone recovery,
  cancellation, keyboard skip focus, Axe, IndexedDB persistence, and explicit
  offline reload in both browser projects.

## Verification — 2026-08-28 UTC

```bash
npm ci
npm audit
npm audit --omit=dev
npm test
npx tsc --noEmit
npm run build
npm run test:e2e
```

Results:

- Clean install completed: 0 full and production audit vulnerabilities.
- Vitest: 12/12 passed across the codec/import and deployment-policy suites.
- TypeScript: `tsc --noEmit` passed. No separate lint script exists; the project
  is strict TypeScript and the production build performs the same type check.
- Production build passed and produced `dist/index.html`: initial app JS 35.91 KB
  (11.76 KB gzip), CSS 16.05 KB (4.29 KB gzip), well below static/PWA budgets.
  Package/consumer testing is not applicable to this private static PWA.
- Playwright 1.58.2: 20/20 passed across desktop Chromium and the 390 × 844
  mobile project. Axe found zero serious/critical violations; keyboard skip
  focus and reduced-motion coverage passed; the suite explicitly takes the PWA
  offline after service-worker control and reloads successfully.
- `/opt/fleet/lib/verify-url.sh http://127.0.0.1:4173/` returned HTTP 200,
  title/lang/one h1/main/alt checks passed, and recorded zero page/console
  errors and zero unnamed buttons.
- Three Lighthouse 13.4.1 mobile runs (full-page screenshot disabled to avoid
  the runner's known Chromium screenshot crash) had no run warnings and each
  scored Performance 100, Accessibility 100, Best Practices 100; LCP 1.6 s,
  CLS 0, TBT 0 ms / 0 ms / 20 ms.
- The PWA manifest/service worker, service-worker update toast, response-policy
  configuration, first-party-only browser traffic, and card-contact privacy are
  covered by the retained deployment/browser tests. CSP, anti-framing, COOP,
  HSTS, manifest MIME, immutable assets, and service-worker revalidation are
  configured in `public/staticwebapp.config.json`.

## Known external release blocker

The report's remaining P1 is the burst rate limit on
`https://api.sociobot.in/api/v1/products/reschedule-proof/verify`. This static
PWA only consumes that centrally hosted Sociobot billing endpoint and has no
server/API route or repository-owned deployment configuration that can enforce
HTTP 429/`Retry-After` there. The application already verifies at most once per
day from its cached verdict; it cannot truthfully claim to repair direct 200-
request abuse of the external endpoint. Per repository rules, no billing or
infrastructure change was made. The billing platform must add and verify the
server-side per-client/token rate limit before a full release verdict.

## Deployment and post-deploy verification — 2026-08-28 UTC

- The final v3 `dist/` is deployed to the existing Azure Static Web App target
  `sf-reschedule-proof` (production). The target's deployment origin is
  `https://brave-smoke-0ea15c610.7.azurestaticapps.net`; the configured custom
  origin is https://reschedule-proof.sociobot.in/.
- Live identity matched the local app artifact byte-for-byte:
  `dist/assets/app-BhEwXpFP.js` and the deployed asset both SHA-256 to
  `c2d2d1ad708a7c0c80f011741584e560cffd7054a721f4b1d4205cf7e767ee4e`.
  The v3 local/deployed service worker SHA-256 is
  `94075c80ec5cab40cada8d71ddd69a4c4cb13a5db101eade18e457b3859f154b`;
  the matching v3 manifest SHA-256 is
  `a841b700de05cf32ecb67163fb357e38741dccd922b47179b186a953ed95517a`.
- Live `/`, app JS, `sw.js`, and manifest returned HTTP 200. The app asset was
  `public, max-age=31536000, immutable`; worker was `no-cache`; manifest was
  `application/manifest+json`. CSP includes `frame-ancestors 'none'`, with
  X-Frame-Options DENY, COOP same-origin, HSTS, nosniff, Referrer-Policy, and
  Permissions-Policy present.
- Live `verify-url.sh` found zero page/console errors, valid title/lang/one
  h1/main/alt structure, and zero unnamed buttons. A 390 × 844 Playwright
  smoke had service-worker control, an offline reload showing the owner h1,
  390 px document width (no overflow), only the first-party origin requested,
  and zero serious/critical Axe findings on owner, Privacy, and Terms.
