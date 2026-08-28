# Move Confirmed repair handoff

## Result

Repository repair, production deployment, and all product-owned QA gates pass.
One external release blocker remains: the central Sociobot billing catalog has
no enabled `reschedule-proof` product, so its production checkout still returns
404. The worker image does not contain the paid-product registration helper
named by the supplied contract, and repository policy forbids replacing it with
an ad-hoc provider or billing-infrastructure mutation.

- Work order: `reschedule-proof-repair-3`
- Failed candidate: `4308e1220b1d4c1f0ea6bff0b06d4a2d53a559b1`
- Verifier report: `.factory/verification-3.md`
- Repair commits: `abadaf3`, `224079e`, `da05d8a`, `8c69910`
- Product/deployment class: static local-first PWA
- Production URL: https://reschedule-proof.sociobot.in/

## Repaired findings

1. Added `.factory/claims.json` with nine claims and exactly one tagged browser
   test per claim. Each declared command passed independently in Chromium and
   the 390 × 844 mobile project.
2. Added a one-click `/demo` with three realistic records, a persistent banner,
   reset and start-real actions, demo-only Plus preview, and the isolated
   `move-confirmed-demo` IndexedDB namespace. Demo card/receipt links retain the
   sandbox route; leaving through **Start for real** deletes demo storage.
3. Reworked the first screen to name one-person appointment businesses, keep
   the primary sample action visible at 1440 × 900 and 390 × 844, state three
   concrete facts, and explain the click outcome. Added `.factory/demo.md` and
   `.factory/copy-audit.md`.
4. Stopped the invalid-license render cycle with one-shot/in-flight guards. The
   regression waits for a false verdict, observes zero mutations for 300 ms,
   submits the free change form, reloads, and confirms only one verification
   request occurred.
5. Added canonical/Open Graph/Twitter metadata, a 1200 × 630 social image,
   180 px Apple touch icon, `robots.txt`, `sitemap.xml`, consistent navigation,
   Param Factory/build identity, How it works and limits sections, and a styled
   HTTP 404 route.
6. Raised the skip and footer link targets to at least 44 × 44 CSS px. The
   deferred demo control also has an explicit accessible name.
7. Split below-fold rendering into short tasks. Three cold Lighthouse 13.4.1
   mobile runs scored 98/99/99 Performance, 100 Accessibility, and 100 Best
   Practices. LCP was 1.55–1.60 s, TBT 65–165 ms, and CLS 0.
8. Advanced the service-worker/manifest shell identity to v4 and precached the
   demo, 404, social image, and Apple icon. Offline demo reload and controlled
   update discovery both pass.
9. Kept deferred controls inert until their event handlers are attached. The
   formerly intermittent mobile receipt path passed five consecutive focused
   runs before the complete suite passed.

Earlier passing behavior is preserved: end-to-end change/receipt import,
expired-receipt rejection, phone validation, cancellation behavior, safe backup
replacement, privacy-preserving URL fragments, and local exports.

## Exact verification evidence

Run from a clean install with Node 22 and Playwright 1.58.2:

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

- Dependency audits: 0 vulnerabilities.
- Vitest: 15/15 passed.
- TypeScript/lint: passed with no diagnostics.
- Production build: passed with `dist/index.html` at the root.
- Playwright: 42/42 passed across desktop Chromium and 390 × 844 mobile.
- Every command in `.factory/claims.json`: passed independently in both
  projects.
- Initial app JS: 41.80 KB / 13.55 KB gzip. CSS: 19.02 KB / 4.85 KB gzip.
  Largest responsive hero: 77.45 KB; mobile hero: 26.33 KB.
- Axe 4.10.2: zero serious/critical findings on Home, Demo, Privacy, Terms, and
  404 in both projects.
- Factory URL checks: correct title/lang, one h1/main, image alt text, named
  buttons, and zero page/console errors. Mobile width equals 390 px; body text
  is 16 px; repaired skip and Terms targets are at least 44 px.
- PWA: service-worker-controlled demo reload retained all sample records while
  offline. A changed worker installed and displayed “An update is ready. Reload
  to use it.”
- Azure Static Web Apps emulator: `/demo`, Privacy, Terms, robots, and sitemap
  return 200; an unknown route returns the styled 404 page with HTTP 404.
- Production response policy: CSP/`frame-ancestors`, HSTS, COOP, frame denial,
  `nosniff`, Referrer-Policy, Permissions-Policy, immutable hashed assets, and a
  `no-cache` worker are present.
- Production verify rate limit: requests 1–30 returned 200; request 31 returned
  429 with `Retry-After: 3`.
- Package/consumer checks are not applicable to this private static PWA.

## Deployment and identity

The repaired PWA was deployed to existing Azure Static Web App
`sf-reschedule-proof` in `centralus`; the custom domain is Ready.

- `dist/assets/app-1mKBtZig.js` and live:
  `81883baa7023785c1639aacd1e622ab5a3eeeb3c6304bf939913d29f83d7ec65`
- `dist/sw.js` and live:
  `d491841088e11d853376d6ff31d2b4975abcd67dad494c850b2accfcda3fcbee`
- `dist/manifest.webmanifest` and live:
  `f7156582d1b1b2423c483e7fc2c8be8ca3e35617449cbe6bad104cf67c616650`
- `dist/index.html` and live:
  `82ffd9fe62157b20a8beb189a260ab74ec821099de4ca89343a657f0ecff49c1`

The live demo is service-worker controlled, reloads offline, has no horizontal
overflow, and has zero serious/critical Axe findings. A live invalid-license
probe made one verification request, reached the persistent inactive notice,
stayed at zero DOM mutations during the stability window, and accepted input in
the free form.

## External blocker and next step

`GET https://api.sociobot.in/api/v1/products/reschedule-proof/checkout` still
returns HTTP 404 with `{"error":"enabled factory product","status":404}`.
The central `/api/v1/products` catalog has no `reschedule-proof` entry. The
required `/opt/fleet/new-paid-product.sh` helper is absent from this worker image
(the available `/opt/fleet/lib` contains only deployment, verification, and
media helpers). No direct Dodo integration or database/billing mutation was
performed. The factory billing owner must register the live $29 one-time product
with return URL `https://reschedule-proof.sociobot.in/`; after that, repeat the
checkout redirect check before release.
