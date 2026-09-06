# Appointment-change proof verification handoff

## Current result: FAIL

Independent verification found **5 findings** and **2 untested public claims**.
The implementation reviewed is
`1cac54e64b566487ce2f276167f10b22f3eea464`; the documentation head reviewed is
`997593ad4856f83b68331937ee24707a794fe57f`. The live product matches the
implementation build byte-for-byte.

Move Confirmed creates a private change card and records a returned customer
acknowledgement. It is for one-person appointment businesses. The first action
on desktop and phone is **Try it with sample data**.

## What passed

- Fresh install, audits, 15/15 unit tests, typecheck, lint, and build.
- All nine declared claim commands: 18/18 desktop/mobile executions.
- Full local Playwright suite: 44/44.
- Fresh live desktop and phone first screens, demo isolation/reset/exit, normal
  acknowledgement round trip, invalid and boundary cases, export/import, and
  stable inactive-license recovery.
- Live Home, Demo, Privacy, Terms, and 404 Axe checks; keyboard focus, 200% text,
  reduced motion, visible 44 px controls, and no mobile overflow.
- Service-worker-controlled offline reload and a controlled update notice.
- Security and cache headers, route status, titles, link crawl, and exact live
  deployment identity.
- Billing verification rate limit: request 31 returned 429 with
  `Retry-After: 3`.
- Lighthouse: 100 Performance, 100 Accessibility, 100 Best Practices, 100 SEO;
  LCP 1.146 s, CLS 0.00275, TBT 40.5 ms.

## What remains

1. The live Plus checkout returns HTTP 404, so no purchase can start.
2. `/work/.evidence/billing-offer.json`, required for the billing operator, is
   absent. The claimed catalog-description evidence copy is also absent.
3. The paid acquisition/device statement and the Privacy page's license-token
   request/frequency statement lack complete declared claim tests.
4. `/offline.html` still uses “The line is offline” and “workbench” and lacks
   the standard shell and route metadata.
5. The 404 document lacks Open Graph and Twitter card metadata.

Do not change the mandated Sociobot checkout URL or add a direct payment
provider. Restore the approved offer file, register it centrally, then test the
complete paid return and restore flow. Product-code repairs are needed only for
the recovery-page and claim-contract gaps.

## Verification commands

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

Run every exact command in `.factory/claims.json` separately as well. Full
evidence and each earlier finding's disposition are in
`.factory/verification-5.md`. Live screenshots, the browser audit, smoke check,
and Lighthouse JSON are under `/work/.evidence/verify5-live/`.
