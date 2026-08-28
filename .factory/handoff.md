# Move Confirmed v1 handoff — VERIFICATION FAIL

## Independent verification verdict (2026-08-28)

**FAIL — candidate `72c1a95f084e4d5286dae092d5cf05747995663f` must not be
released.** The deployed URL https://reschedule-proof.sociobot.in/ is byte-for-byte
the candidate for its app JS/CSS, service worker, manifest, and artwork; this is
not a deployment-only mismatch.

Two P1 defects violate the researched brief: acknowledgement receipts are accepted
after the associated local card has expired, and arbitrary non-phone text produces
a recipient-less `sms:?body=...` action while allowing a notification attempt to be
logged. There is also a P2 cancellation form display defect and P2 production cache
policy gap. Full evidence, exact commands/results, PWA/offline/update checks,
accessibility, privacy/network checks, and required fixes are in
`.factory/verification.md`.

The former builder assertions below are retained as historical handoff context;
they do not supersede this independent release verdict.

## What shipped

- A Vite + TypeScript installable PWA whose production output is `dist/`.
- Manual appointment entry and first-event `.ics` import for reschedules and
  cancellations.
- Private confirmation cards encoded in URL fragments. Customer phone/email are
  excluded from shared links; every link has an explicit expiry.
- User-controlled SMS and email composer links. The log accurately calls these
  notification attempts rather than claiming carrier delivery.
- Customer acknowledgement and a token-matched, timestamped return receipt that
  the originating device imports into its local audit trail.
- IndexedDB persistence, 30-day notification coverage, status history, manual
  acknowledgement labeling, delete confirmation, JSON backup/restore, and CSV
  export.
- Service-worker shell caching, offline fallback, install prompt, update notice,
  versioned cache, and responsive 390 px layout.
- Move Confirmed Plus ($29 one time): Sociobot checkout/verification contract,
  returned-license storage, once-daily verification cache, restore form, offline
  optimistic unlock, saved business defaults, and custom templates. Core cards,
  receipts, safety, and exports remain free.
- `/privacy/` and `/terms/`, MIT license, README, and product-specific design
  documentation.
- Original art-deco transit poster hero, generated with the factory Azure image
  model on 2026-08-28. Source/prompt live in `assets/src/`; 768 px and 1280 px
  WebP derivatives are 26 KB and 76 KB.

## Run and verify

```bash
npm install
npm test
npm run build
npm run test:e2e
```

Required build command: `npm run build`. It produces `dist/index.html` plus the
legal routes and PWA assets.

Verification completed on 2026-08-28:

- `npm test`: 4/4 unit tests passed.
- `npm run test:e2e`: 6/6 passed across desktop Chromium and a 390 × 844 mobile
  viewport, including the complete acknowledgement round trip, Axe, and an
  explicit `context.setOffline(true)` reload.
- Axe 4.10: no serious or critical violations, including color contrast.
- `/opt/fleet/lib/verify-url.sh`: HTTP 200, title/lang/main present, one `<h1>`,
  zero missing image alts, zero unlabeled buttons, and zero console errors.
- Lighthouse 13.4.1 mobile against the production preview: Performance 99,
  Accessibility 100, Best Practices 100; LCP 1.6 s, CLS 0, TBT 90 ms.
- Built initial assets: JS 32.44 KB (10.70 KB gzip), CSS 15.86 KB (4.24 KB
  gzip), largest hero 76 KB. No runtime third-party scripts, fonts, or analytics.
- `npm audit --omit=dev`: zero vulnerabilities (full audit also zero after
  updating Vite and Vitest to patched releases).

## Known gaps and honest boundaries

- Static hosting deliberately has no contact-data backend. The customer must
  return the prepared receipt and the business must open it on the device that
  created the card; there is no silent cross-device synchronization.
- A notification entry proves that the composer was opened or the link copied,
  not that an SMS/email carrier delivered it. The UI and terms state this.
- Anyone holding an unexpired private card can produce its matching receipt; it
  is proof of link possession, not identity verification. Use is unsuitable for
  emergency, medical, regulated, or legally required notices.
- `.ics` import intentionally handles the first event and common UTC/floating
  date-time forms. Recurrence expansion and named-timezone rules remain with the
  user’s existing calendar.
- The factory must register the billing product and may set
  `VITE_BILLING_API_URL=https://pilot-api.sociobot.in/api/v1` for staging. The
  source contains the required slug but no provider product ID or secret.

## Suggested next steps

Run the 30-day pilot against the visible 90% notification target, gather disputed
change reasons, and only then consider an optional privacy-preserving sync relay.
Do not add automated outbound messaging unless consent and delivery semantics can
be represented honestly.
