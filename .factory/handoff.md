# Move Confirmed repair handoff

## Repair identity

- Work order: `reschedule-proof-repair-2`
- Base/report commit: `088ad6f001670b79de8ce85b4b4300f3a345b15e`
- Failed candidate: `3454aec2cedc0f31b595d74b866b1886d2ee7c5c`
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
- Vitest: 11/11 passed across the codec/import and deployment-policy suites.
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

## Deployment and post-deploy verification

The repair artifact is committed and pushed to `main`, then deployed to the
existing Azure Static Web App using the configured `sf-reschedule-proof` target.
Post-deploy identity, headers, browser/PWA behavior, and the external billing
rate-limit dependency should be rechecked against the commit hash below.
