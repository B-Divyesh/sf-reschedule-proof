# Verification report — FAIL

**Candidate:** `72c1a95f084e4d5286dae092d5cf05747995663f`  
**Verified URL:** https://reschedule-proof.sociobot.in/  
**Date:** 2026-08-28  
**Verdict:** **FAIL — do not release this candidate.**

The deployment is the tested candidate: SHA-256 matched exactly for the deployed
`app-BfLgoVrX.js`, `app-B5gBvkSl.css`, `sw.js`, manifest, and both WebP assets.
The functional happy path is substantially present, but two high-severity defects
break the core promise of an expiring, auditable customer acknowledgement.

## Blocking defects

### P1 — Expired cards can still add a new acknowledgement to the local proof log

**Acceptance-contract impact:** the brief explicitly requires acknowledgement
links to expire. A receipt is accepted based only on record ID, token, and a
timestamp no more than five minutes in the future; `renderReceipt()` never checks
the record's `expiresAt`.

**Fresh reproduction:** create a normal confirmation card and retain its receipt
URL/token; move that originating local record's expiry to the past (the equivalent
state after normal passage of time); open a receipt containing the matching token
and a current timestamp. The UI renders **“The receipt matches your local
change.”** and exposes **“Add acknowledgement to log”**. The customer card itself
correctly renders expired and has no acknowledgement button. Thus the expiry can
be bypassed precisely at the acknowledgement-import step.

**Risk:** a retained card holder can create a post-expiry acknowledgement, changing
the business's supposedly expiring audit record after the privacy deadline.

### P1 — Arbitrary non-phone text creates and logs a notification attempt

**Acceptance-contract impact:** the product's central measure is a logged
notification for a changed appointment. Invalid input must recover rather than
record a false handoff.

**Fresh reproduction:** enter customer mobile `not-a-number` and business reply
mobile `reply`, with otherwise valid required fields. The app creates the card,
logs the attempted notification when used, and emits the customer action URL
`sms:?body=...` — no recipient. `type=tel` alone does not validate a telephone
number. The user is therefore led to a recipient-less composer while the local log
can represent that as a notification attempt.

**Risk:** failed or never-addressed changes can inflate notification coverage and
undermine the product's proof-of-change claim.

## Non-blocking defects / release findings

### P2 — Cancellation leaves the “New time” input visibly displayed

Selecting **Cancelled** makes `newStart.required` false but does not hide
`#new-time-label`: CSS `label { display: grid }` overrides the browser's
`[hidden] { display: none }`. The value is ignored for a cancellation, but the
form communicates a contradictory extra appointment time.

### P2 — Deployed immutable assets have a 30-second revalidation cache policy

The production CSS, hashed JS, artwork, icons, and `offline.html` all return
`Cache-Control: public, must-revalidate, max-age=30`. This does not meet the PWA
performance guidance for long-lived immutable caching of hashed assets. The
service-worker cache masks much of this after installation, but first/revalidated
loads still miss the stated deployment policy.

### Advisory — production response hardening is incomplete

The live site has HSTS, `nosniff`, and strict-origin referrer policy, but no
Content-Security-Policy, `frame-ancestors`/X-Frame-Options, or COOP header. The
manifest is served as `application/octet-stream` rather than a manifest/JSON MIME
type. Chromium nonetheless installed/controlled the service worker in this check.

## What passed

- Fresh detached clone at the candidate SHA; `npm ci` completed with 0 audit
  vulnerabilities. `npm test`: 4/4 passed. Exact `npm run build` passed and
  produced `dist/`. `npm run test:e2e`: 6/6 passed (desktop and 390 × 844).
  There is no separate lint script; TypeScript checking is part of `npm run build`.
- Independent browser exercise passed the reschedule card → SMS/email composer
  handoff → customer acknowledgement → token-matched receipt import normal path.
  IndexedDB records survived reload. Customer phone/email were absent from the
  card fragment. No automatic outbound requests/messages occurred.
- Boundary/recovery checks passed for blank required fields, missing customer
  contact, missing return contact, identical reschedule time, past expiry, malformed
  `.ics`, and malformed card/receipt handling. Cancellation selection is operable;
  only its visual hidden state fails as noted above.
- Keyboard smoke: the skip link is first focusable item, all primary controls are
  keyboard reachable, and a designed 3 px visible focus outline is present. The
  skip target is not programmatically focused because `main` has no `tabindex`;
  this is an accessibility improvement item, not a serious/critical Axe result.
- Axe 4.10.2 found **0 serious/critical** findings independently on the owner page
  and public customer card. At 390 px, there was no horizontal overflow; body text
  was 16 px; `prefers-reduced-motion` reduced transitions to 0.01 ms.
- Local and live smoke tests recorded zero console errors and zero page errors.
  Live initial load requested only `reschedule-proof.sociobot.in`; no analytics,
  third-party scripts, fonts, or contact-data network requests were observed.
- PWA: production manifest includes 192/512/maskable icons and standalone start
  URL. Service-worker control, cached offline reload, and an update simulation all
  passed. The simulation changed the worker bytes after control and observed the
  in-app toast **“An update is ready. Reload to use it.”**.
- Build budgets: initial JS 32.44 KB (10.70 KB gzip), CSS 15.86 KB (4.24 KB gzip),
  largest hero 76 KB — all within the stated static/PWA limits. Repeated mobile
  Lighthouse audit on the production preview returned Performance 99,
  Accessibility 100, Best Practices 100, LCP 1.58 s, CLS 0, TBT 123 ms. The
  Lighthouse CLI exited non-zero after result generation because its headless tab
  crashed during final screenshot collection; the emitted audit JSON had no run
  warnings. A prior repeat produced Performance 87/TBT 492 ms under that same
  unstable post-audit browser condition, so performance should be rechecked in CI.

## Live deployment and response evidence

- `GET /`, `/privacy/`, `/terms/`, manifest, and `sw.js`: HTTP 200 over HTTPS.
- Exact candidate asset hashes matched on production: JS
  `385e31afda84bf767c8bb7d3de0a0c15bcc86e00493b98ab7a8f4dd41d24ea74`, CSS
  `32bd0c60147d453eb0ce88ce90a0890c8e362b8f0c81d72bfa111d5301193bec`, and SW
  `6a101259ed9542a6de3e31bde7d618c41686f83d3993928af8c70c1b5c096bef`.
- Response headers: HSTS (126 days, subdomains, preload), `X-Content-Type-Options:
  nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin`; see the
  findings above for absent hardening/caching headers.

## Required before re-verification

1. Reject/import no receipt when the matching local record has expired; test both
   delayed normal receipts and hand-crafted receipt fragments.
2. Validate phone values before card creation (or require an email), reject malformed
   recipient data, and never log an attempt when no recipient URI can be opened.
3. Make the cancellation new-time control actually disappear (for example use a
   selector with `display: none` for `[hidden]`) and add coverage.
4. Configure immutable cache headers for hashed static files, and add appropriate
   production CSP/frame/origin headers and manifest MIME type.
