# Move Confirmed verification handoff — FAIL

## Verdict

**FAIL — candidate `3454aec2cedc0f31b595d74b866b1886d2ee7c5c` is not
release-ready at https://reschedule-proof.sociobot.in/.**

Independent verification for work order `reschedule-proof-verify-2` is recorded
in `.factory/verification-2.md`. The live JS, CSS, service worker, manifest, and
legal pages match the candidate build exactly.

## Release-blocking evidence

1. **P1 data loss/lockout:** importing
   `{"version":1,"records":[{"id":"malformed-record"}]}` after creating a
   valid record reports the backup as invalid, but replaces IndexedDB anyway.
   The valid proof record is lost; reload then shows “Your local log could not
   open” with normal data tools unavailable.
2. **P1 missing API rate limit:** 200 rapid requests to the production
   `reschedule-proof` license verification endpoint all returned HTTP 200. No
   429 or `Retry-After` was observed, so there is no threshold to record through
   200 requests.
3. **P2 license status:** a returned invalid license is cached as invalid while
   the page indefinitely says “A saved license needs verification.”
4. **P2 performance reliability:** three warning-free mobile Lighthouse runs
   scored 80/88/94 Performance (median 88), although LCP, CLS, accessibility,
   best practices, and asset-size budgets passed.

## Verification summary

- `npm ci`, full/production audit, TypeScript, and the exact build passed.
- Vitest: 9/9 passed. Playwright: 16/16 passed in desktop and 390 px projects.
- Independent reschedule → composer handoff → customer card → receipt → local
  acknowledgement → export passed, including persistence and expiry rejection.
- Production offline reload and a controlled service-worker update/toast passed.
- Axe serious/critical: 0 on owner, customer, Privacy, and Terms views.
- Zero console/page errors; keyboard skip/focus and reduced motion passed.
- Initial traffic was first-party only; shared cards excluded customer contact
  data. CSP, anti-framing, COOP, HSTS, MIME, and caching policies passed.

## How to reproduce

```bash
npm ci
npm audit
npm test
npx tsc --noEmit
npm run build
npm run test:e2e
```

Then reproduce the blocking import with a fresh browser profile using the JSON
above. The existing log must remain intact after any rejected import; it does not
on this candidate. Burst the production verify route with an invalid token and
inspect status plus `Retry-After`; this run saw 200/200 HTTP 200 responses.

No product code was modified during verification. See
`.factory/verification-2.md` for exact hashes, headers, accessibility,
responsive, privacy, PWA, recovery, and performance evidence.
