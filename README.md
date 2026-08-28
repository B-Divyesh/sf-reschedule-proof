# Move Confirmed

Move Confirmed is a local-first PWA for a one-person appointment business that
already has a calendar but needs a reliable handoff when an appointment moves or
is cancelled. It creates a private change card, opens the owner’s SMS or email
composer, and imports the customer’s timestamped acknowledgement receipt into a
local audit log.

It is intentionally not a booking marketplace, calendar replacement, automated
messaging service, or proof of carrier delivery.

## Try the isolated demo

Open `/demo` or select **Try it with sample data** on the first screen. The demo
starts with three realistic appointment changes and uses the separate
`move-confirmed-demo` IndexedDB database. **Reset demo** restores the sample.
**Start for real** deletes the demo database and returns to the real workspace.
Nothing in demo mode reads or writes the real appointment log or license keys.

## How the acknowledgement round trip works

1. The business enters or imports an `.ics` event and creates a change card.
2. The app opens SMS/email with a private fragment link. Customer contact details
   never enter that link and no message is sent without the owner pressing Send.
3. The customer reviews the card and chooses **I’ve seen this change**.
4. Their browser prepares a token-matched receipt and opens SMS/email back to the
   business.
5. Opening that receipt on the original device verifies it against the local
   record and logs the acknowledgement.

The static architecture means there is no hidden server collecting appointment
or customer data. It also means receipts must be returned and opened; the app
does not claim silent cross-device sync.

## Run, test, and build

Requires Node.js 22+.

```bash
npm ci
npm run dev
npm test
npm run typecheck
npm run lint
npm run build
npm run preview
npm run test:e2e
```

The production build command is exactly `npm run build`. Static output lands in
`dist/`, with `dist/index.html` at its root. Playwright is pinned to 1.58.2 as
required by the build worker.

Published product claims and their exact browser commands are listed in
`.factory/claims.json`. Every claim test starts from the direct demo entry point.
The Plus test uses the demo-only settings preview without contacting billing or
reading a real license.

## Privacy and data ownership

Records and Plus defaults are stored in IndexedDB. The license token and cached
verification verdict are stored in localStorage. JSON and CSV export remain free.
The app includes no analytics, trackers, hosted fonts, or runtime CDN resources.
See `/privacy/` and `/terms/` in the built app.

## Paid unlock

Move Confirmed Plus is a one-time $29 unlock for saved business defaults and a
custom message template. Checkout and verification use the Sociobot billing API;
no payment provider is embedded and no product ID is hardcoded. Override the API
base for staging with `VITE_BILLING_API_URL=https://pilot-api.sociobot.in/api/v1`.

## Deployment

Deploy the contents of `dist/` to Azure Static Web Apps with HTTPS. The build
includes `staticwebapp.config.json` for clean routes, response hardening,
manifest MIME, service-worker revalidation, and immutable built-asset caching.
Customer cards use URL fragments on `/`. The factory owns DNS and deployment.

## License

MIT. Generated hero art is original to this product; prompt and provenance are
recorded in `.factory/design.md` and `assets/src/`.
