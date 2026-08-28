# Move Confirmed verification handoff — FAIL

## Result

**FAIL — do not release candidate
`4308e1220b1d4c1f0ea6bff0b06d4a2d53a559b1`.**

Independent verification ran on 2026-08-28 against both the clean checkout and
https://reschedule-proof.sociobot.in/. The live deployment matches the candidate
byte-for-byte. Full evidence is in `.factory/verification-3.md`.

## Release blockers

1. `.factory/claims.json` is missing, so the mandatory first test gate has no
   runnable claim tests. Published offline/privacy/export claims are unlisted.
2. The first screen does not name the intended one-person appointment business,
   has no fully visible mobile primary action, and offers no “Try it with sample
   data” demo. `/demo` and `?demo=1` are ordinary empty real workspaces;
   `.factory/demo.md` and `.factory/copy-audit.md` are missing.
3. A cached invalid/revoked/expired license creates an unbounded render cycle
   between `renderOwner()` and `reconcileLicense()`. A fresh production probe
   remained stuck beyond 30 seconds and required browser termination, so the
   promised free workflow is not reliably usable after rejection.
4. The visible $29 purchase link returns HTTP 404 with
   `{"error":"enabled factory product","status":404}` instead of checkout.

Additional P2/P3 findings cover incomplete metadata/discovery/404 structure, one
of three Lighthouse runs scoring 89, and two marginally undersized touch targets.

## What passed

- `npm ci`; both npm audits; 12/12 Vitest tests; `npx tsc --noEmit`; exact
  production build; and 20/20 Playwright tests.
- Independent production change → SMS composer → customer card → receipt →
  acknowledged local log, reload persistence, CSV/JSON export, cancellation,
  boundary phone validation, invalid-input recovery, `.ics` recovery, malformed
  backup preservation, and expired-receipt rejection.
- Axe: 0 serious/critical findings on owner, customer, Privacy, and Terms at
  desktop and 390 px. `verify-url.sh` passed with no console/page errors.
- PWA manifest, service-worker control, offline reload with a saved record,
  tab-close persistence, and simulated update toast.
- Privacy/network checks, production security headers, immutable caching, and
  bundle/image budgets.
- Billing verification rate limiting now passes: requests 1–30 returned 200;
  request 31 returned 429 with `Retry-After: 4`.
- Live candidate identity hashes match; see the full report.

## Reproduce

```bash
npm ci
npm audit
npm audit --omit=dev
npm test
npx tsc --noEmit
npm run build
npm run test:e2e
```

Before any future release, run each command declared in the newly added
`.factory/claims.json` from the direct demo entry point, then repeat the cold
first-read, checkout, invalid-license stability, offline/update, Axe, and mobile
Lighthouse checks described in `.factory/verification-3.md`.

No product code or deployment configuration was changed during verification.
