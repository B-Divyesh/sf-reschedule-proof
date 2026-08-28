# Independent verification 4 — FAIL

**Candidate:** `4889bc57d292e403a9c026d78101ef9db9ab3fb4`  
**Production URL:** https://reschedule-proof.sociobot.in/  
**Work order:** `reschedule-proof-verify-4`  
**Verified:** 2026-08-28 UTC  
**Verdict:** **FAIL — do not release until the paid checkout is enabled.**

The static PWA, its demo, local-first workflow, and live deployment are in good shape. The candidate still cannot meet its advertised one-time monetization: the visible **Buy Plus for $29** link returns HTTP 404 from the mandated Sociobot billing API. This is a release-blocking integration failure, not a deployment mismatch.

## Mandatory gates

### PASS — claims and demo sandbox

`.factory/claims.json` exists and has nine claims. From the clean checkout, every listed command was run before broader product QA:

```text
npm run test:e2e -- --grep @claim:demo-sandbox
npm run test:e2e -- --grep @claim:proof-roundtrip
npm run test:e2e -- --grep @claim:contact-privacy
npm run test:e2e -- --grep @claim:offline-reload
npm run test:e2e -- --grep @claim:export-formats
npm run test:e2e -- --grep @claim:calendar-import
npm run test:e2e -- --grep @claim:backup-import
npm run test:e2e -- --grep @claim:expiring-links
npm run test:e2e -- --grep @claim:plus-once
```

All passed in both Desktop Chromium and the 390 × 844 mobile project. A fresh full browser run also passed **42/42** in 1.8 minutes. The direct `/demo` entry creates only `move-confirmed-demo`, supplies three realistic records, shows the persistent reset/start-real banner, and keeps the real log separate.

### PASS — cold first-read and one-click demo

Fresh live-page evidence at desktop and mobile says:

- **What it does:** creates a private change card and keeps the returned acknowledgement receipt beside the appointment record.
- **For whom:** “For one-person appointment businesses”.
- **What to click first:** **Try it with sample data**, with adjacent copy that it opens three realistic changes in a separate demo log.

The first screen therefore meets the plain-words and demo-entry requirements. There were no console or page errors.

## Release-blocking defect

### P1 — Plus checkout is unavailable

The production Buy Plus link targets the required endpoint:

```text
GET https://api.sociobot.in/api/v1/products/reschedule-proof/checkout
HTTP/2 404
{"error":"enabled factory product","status":404}
```

It does not redirect to hosted checkout. The product advertises “Move Confirmed Plus — $29 once”, so a purchaser cannot obtain the advertised paid capability. The static app correctly uses the Sociobot billing URL and does not embed a payment provider; the factory billing owner must enable/register this product and then repeat the redirect check. No product-code change can make a missing central billing catalog entry work.

## Repository and functional verification

Clean-install commands completed successfully:

```text
npm ci                         # 0 vulnerabilities reported
npm test                       # 15/15 passed
npm run typecheck              # passed
npm run lint                   # passed (TypeScript check)
npm run build                  # passed; dist/ produced
npm run test:e2e               # 42/42 passed
```

Independent live functional exercise at 390 px:

1. Created a normal rescheduled appointment with a 7–15 digit customer phone.
2. Verified the SMS composer URI, customer card, acknowledgement receipt, and persisted `Confirmed` log state after reload.
3. Confirmed the shared fragment payload has no customer phone/email fields; observed HTTP(S) traffic was first-party only. `replyPhone` is intentionally present so the customer can return the receipt.
4. Rejected invalid customer/reply phones with a specific recovery message and no record creation. A malformed ICS file showed “This file does not contain a calendar event.”
5. The automated suite additionally covers cancellation, expired cards and receipts, backup validation/recovery, JSON/CSV exports, Plus demo defaults, route behavior, and invalid-license stability.

## Live deployment identity and policy

Fresh locally built output matched live byte-for-byte:

| File | SHA-256 |
| --- | --- |
| `assets/app-1mKBtZig.js` | `81883baa7023785c1639aacd1e622ab5a3eeeb3c6304bf939913d29f83d7ec65` |
| `assets/app-DKWHTq91.css` | `67e75687a69be506642e4cbdf9e141b2f6408478d7da805a6e4e6c4f86a612b1` |
| `sw.js` | `d491841088e11d853376d6ff31d2b4975abcd67dad494c850b2accfcda3fcbee` |
| `manifest.webmanifest` | `f7156582d1b1b2423c483e7fc2c8be8ca3e35617449cbe6bad104cf67c616650` |
| `index.html` | `82ffd9fe62157b20a8beb189a260ab74ec821099de4ca89343a657f0ecff49c1` |

`/`, `/demo`, `/privacy/`, `/terms/`, `/404/`, `robots.txt`, and `sitemap.xml` return 200; an unknown route returns HTTP 404. The live response has the specified CSP, HSTS, `frame-ancestors 'none'`, COOP, frame denial, `nosniff`, strict referrer policy, and restrictive Permissions-Policy. Built JS/CSS use one-year immutable caching; `sw.js` uses `no-cache`.

The billing verify endpoint did rate-limit the requested rapid probe: requests 1–32 returned 200, request **33** returned **429** with `Retry-After: 4`. There is no sign-in or product backend, so Entra, server persistence, health, and concurrency checks are not applicable.

## Accessibility, PWA, and performance

- `/opt/fleet/lib/verify-url.sh` passed live: HTTP 200, correct title/lang, one `h1`, `main`, image alt text, named buttons, 1.50 s load, zero errors.
- Live Axe scans of Home, Demo, Privacy, Terms, and 404 at 1440 px and 390 px found **0 serious/critical and 0 total violations**. Each had one h1, main, and no horizontal overflow. Keyboard and 44 px target checks pass in the browser suite; reduced-motion behavior is covered by the shipped CSS.
- The live demo is service-worker controlled and, after first visit, reloaded offline with the sample record and `OFFLINE READY` status. A temporary verifier server that served the exact built PWA and then a byte-changed worker produced the in-app “An update is ready. Reload to use it.” notice.
- Initial app JS is 41,796 bytes / 13,449 gzip; CSS is 19,018 / 4,863 gzip; the mobile and desktop hero images are 26,334 and 77,450 bytes. All stated static bundle/image budgets pass.
- Fresh Lighthouse 13.4.1 mobile against live production: Performance **92**, Accessibility **100**, LCP **1.4 s**, CLS **0.003**, TBT **350 ms**.

## Required next step

Enable the `reschedule-proof` one-time product in the Sociobot billing catalog with return URL `https://reschedule-proof.sociobot.in/`, then verify that the existing checkout URL redirects successfully. Re-run this verification after that external change. No other release-blocking defect was found.

