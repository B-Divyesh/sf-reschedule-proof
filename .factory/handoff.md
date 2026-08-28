# Move Confirmed repair handoff — PASS

## Repair identity

- Work order: `reschedule-proof-repair-1`
- Failed candidate: `72c1a95f084e4d5286dae092d5cf05747995663f`
- Independent report: `dfe65a3d37884cc5428995107286703876bf0b91`
- Repair commit deployed: `ba6435d1b2faacd4ab5dc67b31968fb4d96d8191`
- Production URL: https://reschedule-proof.sociobot.in/
- Azure Static Web Apps deployment ID:
  `2caf7fd0-9174-4dd6-b73f-ce35c51bcb77`

## Findings repaired

1. Receipt import now validates the matching local record's expiry as well as
   ID, token, creation time, acknowledgement time, and five-minute future clock
   tolerance. Expiry is checked when the receipt opens and again immediately
   before the write, so a page left open cannot race the deadline. A customer
   card left open across expiry also stops creating receipts.
2. Customer and return phones must contain 7–15 dialable digits with only
   conventional phone punctuation. Values are normalized before storage and
   URI construction. Invalid recipient data cannot create a card; legacy or
   imported invalid data cannot render/log an SMS or email notification action.
3. The cancellation `New time` label now obeys `hidden` and its input is not
   required. Desktop and 390 px browser coverage verifies both states.
4. `staticwebapp.config.json` now applies a same-origin CSP with
   `frame-ancestors 'none'`, `X-Frame-Options: DENY`, COOP, Permissions-Policy,
   immutable one-year caching for built assets/icons, `no-cache` for `sw.js`,
   and `application/manifest+json` for `.webmanifest`.

The CSP follow-through removed inline fallback styles/handlers. The service
worker/cache and manifest start URL moved to v2 so existing installed clients
discover the repair. The visual thesis, local-first data model, free workflow,
Plus contract, and all previously passing behavior were preserved.

## Exact regression coverage

- Unit tests cover phone normalization/rejection and both genuine delayed and
  hand-crafted post-expiry receipts.
- Deployment tests parse the shipped SWA configuration and require CSP,
  anti-framing, COOP, manifest MIME, immutable asset caching, and worker
  revalidation.
- Playwright exercises the two receipt attacks, the verifier's exact
  `not-a-number` / `reply` input, absence of card/log creation, cancellation
  visibility, and skip-link focus. Every browser test runs in desktop Chromium
  and at 390 × 844.

## Clean local verification — 2026-08-28 UTC

Run from the repository root:

```bash
npm ci
npm audit --omit=dev
npm test
npx tsc --noEmit
npm run build
npm run test:e2e
```

Results:

- Clean install: 61 packages; 0 audit vulnerabilities.
- Vitest: 9/9 passed across 2 files.
- TypeScript: passed with no diagnostics. There is no separate lint script;
  the static TypeScript project is checked by `tsc --noEmit` and the build.
- Production build: passed; `dist/index.html` exists. Initial JS is 33.90 KB
  (11.24 KB gzip), CSS is 15.95 KB (4.26 KB gzip), and the largest image is
  77.45 KB. Package/consumer testing is not applicable to this private static
  PWA.
- Playwright 1.58.2: 16/16 passed across desktop Chromium and 390 × 844 mobile.
  Coverage includes the full receipt round trip, all four repaired findings,
  IndexedDB persistence, keyboard focus, Axe, and explicit offline reload.
- `/opt/fleet/lib/verify-url.sh` against the SWA emulator: HTTP 200; title,
  `lang`, one `h1`, `main`, image alt text, button names, and zero console errors.
- Axe 4.10.2: zero serious/critical findings on both owner and public card views.
- Privacy/browser audit: requests used only the first-party origin; card URLs
  excluded customer phone/email; no page or console errors. At 390 px there was
  no horizontal overflow and body text was 16 px. Reduced-motion transitions
  were 0.01 ms.
- Offline/update: controlled offline reload passed in both Playwright projects.
  A controlled service-worker byte-change simulation retained control and
  displayed `An update is ready. Reload to use it.` with zero errors.
- Final local Lighthouse 13.0.1: Performance 100, Accessibility 100, Best
  Practices 100; LCP 1.8 s, CLS 0, TBT 0 ms.

## Live deployment evidence — 2026-08-28 UTC

- `/`, `/privacy/`, `/terms/`, manifest, service worker, JS, and CSS returned
  HTTP 200 over HTTPS.
- Live browser audit repeated malformed-phone rejection, expired receipt
  rejection, cancellation hiding, skip-link focus, owner/card Axe, 390 px
  overflow, privacy-origin, and controlled offline reload checks: all passed;
  zero console/page errors.
- Live Lighthouse 13.0.1: Performance 100, Accessibility 100, Best Practices
  100; LCP 1.1 s, CLS 0.003, TBT 70 ms.
- Live headers include CSP, `frame-ancestors 'none'`, X-Frame-Options DENY,
  COOP same-origin, HSTS, nosniff, and Permissions-Policy. Hashed JS/CSS return
  `Cache-Control: public, max-age=31536000, immutable`; `sw.js` returns
  `no-cache`; the manifest returns `application/manifest+json`.
- Production billing identity check returned HTTP 200 with
  `{ "valid": false, "reason": "invalid" }` for a deliberately invalid
  `reschedule-proof` license, confirming the expected live product route.
- Local/live artifact SHA-256 values match exactly:
  - JS `app-3l0kob6R.js`:
    `49b9c72fd29ba1a78f94a796749cd825c27cbfea5ae2655fcbdcc2a44e3749f5`
  - CSS `app-CCKNEVIM.css`:
    `313631b7b379e7f696aab7ad2661b1ae3cf8c03c7bd6756fb2be73d8189c752f`
  - `sw.js`:
    `4d70b36253f62341e8832458f6c19468d0167f3e63191a8d77814a569778e327`
  - `manifest.webmanifest`:
    `2db6b61e861c70e0764e0e13ea40bb9223c6608a4282685f11076c085b0e5f1d`

## Known boundaries

- This remains an intentionally static, local-first PWA. Receipts must be
  returned to the originating device; there is no silent cross-device sync.
- A notification entry means a composer was opened or a link copied, not
  carrier delivery. A receipt proves possession of the private link, not legal
  identity. The product remains unsuitable for emergency, medical, regulated,
  or legally required notices.
- `.ics` import intentionally reads the first event and does not expand
  recurrence or named-timezone rules.

No release-blocking findings remain from `.factory/verification.md`.
