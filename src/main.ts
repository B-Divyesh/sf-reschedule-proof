import './style.css';
import { cardUrl, decodePayload, humanDate, parseIcs, randomToken, receiptUrl, recordsToCsv, toLocalInput } from './codec';
import { DEMO_MODE, deleteRecord, discardDemoData, ensureDemoData, getRecord, getRecords, getSettings, replaceRecords, resetDemoData, saveRecord, saveSettings } from './db';
import { buyUrl, cachedUnlocked, getCachedVerdict, getLicense, saveLicense, storeReturnedLicense, verifyLicense } from './license';
import type { BusinessSettings, CardPayload, ChangeRecord, NotifyChannel, ReceiptPayload } from './types';
import { normalizePhone, receiptVerdict, validBackupRecords, validEmail } from './validation';

const appElement = document.querySelector<HTMLDivElement>('#app');
if (!appElement) throw new Error('App root is missing.');
const app = appElement;

let installPrompt: BeforeInstallPromptEvent | null = null;
let lastCreated: ChangeRecord | null = null;
let licenseReconciled = false;
let licenseReconciling = false;
let ownerRenderVersion = 0;
const BUILD_ID = 'repair-3';

if (DEMO_MODE && location.pathname !== '/demo') history.replaceState({}, '', `/demo${location.hash}`);

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const esc = (value: unknown): string => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

const icon = (name: 'arrow' | 'check' | 'ticket' | 'signal' | 'download' | 'lock'): string => {
  const paths = {
    arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
    check: '<path d="m4 12 5 5L20 6"/>',
    ticket: '<path d="M4 5h16v4a3 3 0 0 0 0 6v4H4v-4a3 3 0 0 0 0-6V5Z"/><path d="M12 8v8"/>',
    signal: '<circle cx="12" cy="12" r="8"/><path d="M12 8v5m0 3h.01"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M5 21h14"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="1"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>'
  };
  return `<svg class="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${paths[name]}</svg>`;
};

function shell(content: string, mode: 'owner' | 'customer' = 'owner'): string {
  return `
    ${DEMO_MODE ? '<aside class="demo-banner" aria-label="Demo mode"><strong>Demo — sample data, nothing is saved to your real log</strong><span><button id="reset-demo" class="demo-action" type="button">Reset demo</button><button id="start-real" class="demo-action" type="button">Start for real</button></span></aside>' : ''}
    <header class="site-header">
      <a class="brand" href="${mode === 'owner' ? (DEMO_MODE ? '/demo' : '/') : '/'}" aria-label="Move Confirmed home">
        <span class="brand-mark" aria-hidden="true"><i></i><i></i></span>
        <span>Move Confirmed</span>
      </a>
      <nav class="site-nav" aria-label="Main navigation"><a href="/demo">Demo</a><a href="${DEMO_MODE ? '/demo#how' : '/#how'}">How it works</a><a href="/privacy/">Privacy</a></nav>
      <div class="header-actions">
        <span id="network-status" class="network-status"><span aria-hidden="true">●</span> <span>${navigator.onLine ? 'Online' : 'Offline ready'}</span></span>
        ${mode === 'owner' ? '<button id="install-button" class="text-button" type="button" hidden>Install app</button>' : ''}
      </div>
    </header>
    <main id="main" tabindex="-1">${content}</main>
    <footer class="site-footer">
      <div><strong>Move Confirmed</strong><span>Proof of change, kept on your device.</span></div>
      <nav aria-label="Legal"><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><a href="https://github.com/B-Divyesh/sf-reschedule-proof" rel="noreferrer">Source (external)</a></nav>
      <p class="generated-note">Built by Param Factory · Build ${BUILD_ID} · Poster artwork generated for this product with the factory image model.</p>
    </footer>
    <div id="live-region" class="sr-only" aria-live="polite"></div>
    <div id="toast" class="toast" role="status" hidden></div>`;
}

function announce(message: string): void {
  const region = document.querySelector<HTMLElement>('#live-region');
  const toast = document.querySelector<HTMLElement>('#toast');
  if (region) region.textContent = message;
  if (toast) {
    toast.textContent = message;
    toast.hidden = false;
    window.setTimeout(() => { toast.hidden = true; }, 4200);
  }
}

function focusPageHeading(): void {
  const heading = document.querySelector<HTMLHeadingElement>('main h1');
  if (!heading) return;
  heading.tabIndex = -1;
  heading.focus();
  const region = document.querySelector<HTMLElement>('#live-region');
  if (region) region.textContent = document.title;
}

async function copyText(value: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const field = document.createElement('textarea');
    field.value = value;
    field.className = 'clipboard-fallback';
    document.body.append(field);
    field.select();
    document.execCommand('copy');
    field.remove();
  }
}

function statusSteps(record: ChangeRecord): string {
  const notified = record.notifications.length > 0;
  const acknowledged = Boolean(record.acknowledgement);
  return `<ol class="status-route" aria-label="Change status">
    <li class="done"><span>${icon('check')}</span><strong>Prepared</strong><small>${humanDate(record.createdAt)}</small></li>
    <li class="${notified ? 'done' : ''}"><span>${notified ? icon('check') : '2'}</span><strong>Notified</strong><small>${notified ? humanDate(record.notifications.at(-1)!.at) : 'Not logged yet'}</small></li>
    <li class="${acknowledged ? 'done' : ''}"><span>${acknowledged ? icon('check') : '3'}</span><strong>Acknowledged</strong><small>${acknowledged ? `${humanDate(record.acknowledgement!.at)} · ${record.acknowledgement!.method}` : 'Waiting for receipt'}</small></li>
  </ol>`;
}

function changeSummary(record: ChangeRecord): string {
  if (record.type === 'cancelled') return `Cancelled · was ${humanDate(record.oldStart)}`;
  return `${humanDate(record.oldStart)} → ${humanDate(record.newStart!)}`;
}

function recordList(records: ChangeRecord[]): string {
  if (!records.length) return `<div class="empty-state">
    <span class="empty-ticket" aria-hidden="true">${icon('ticket')}</span>
    <h3>No changes logged yet</h3><p>Your first reschedule or cancellation will appear here with its notification and acknowledgement trail.</p>
    <a class="inline-action" href="#create">Prepare the first card ${icon('arrow')}</a>
  </div>`;
  return `<div class="record-list">${records.map((record) => `
    <article class="record" data-record-id="${esc(record.id)}">
      <div class="record-heading">
        <div><span class="eyebrow">${record.type}</span><h3>${esc(record.title)}</h3><p>${esc(record.customerName)} · ${esc(changeSummary(record))}</p></div>
        <span class="state-badge ${record.acknowledgement ? 'confirmed' : record.notifications.length ? 'waiting' : ''}">${record.acknowledgement ? '✓ Confirmed' : record.notifications.length ? '○ Awaiting reply' : '△ Prepared'}</span>
      </div>
      ${statusSteps(record)}
      <div class="record-actions">
        <button class="secondary share-record" type="button" data-id="${esc(record.id)}" aria-label="Share confirmation card">Share card</button>
        ${!record.acknowledgement ? `<button class="text-button manual-record" type="button" data-id="${esc(record.id)}" aria-label="Mark acknowledgement manually">Mark acknowledged</button>` : ''}
        <button class="text-button danger delete-record" type="button" data-id="${esc(record.id)}" aria-label="Delete this change record">Delete</button>
      </div>
    </article>`).join('')}</div>`;
}

function dashboard(records: ChangeRecord[]): string {
  const cutoff = Date.now() - 30 * 86_400_000;
  const recent = records.filter((record) => new Date(record.createdAt).getTime() >= cutoff);
  const notified = recent.filter((record) => record.notifications.length).length;
  const acknowledged = recent.filter((record) => record.acknowledgement).length;
  const percent = recent.length ? Math.round(notified / recent.length * 100) : 0;
  return `<section class="scoreboard" aria-labelledby="score-title">
    <div><p class="eyebrow">30-day signal board</p><h2 id="score-title">Is every change visible?</h2></div>
    <dl><div><dt>Changes</dt><dd>${recent.length}</dd></div><div><dt>Notified</dt><dd>${notified}</dd></div><div><dt>Acknowledged</dt><dd>${acknowledged}</dd></div><div><dt>Coverage</dt><dd>${percent}%</dd></div></dl>
    <p class="score-note">Target: log a notification for at least 90% of changed appointments.</p>
  </section>`;
}

function howItWorks(): string {
  return `<section class="how-it-works" id="how" aria-labelledby="how-title">
    <div><p class="eyebrow">Three stops</p><h2 id="how-title">How the change reaches your log</h2></div>
    <ol><li><strong>Prepare the change.</strong><span>Enter an appointment or import its calendar event.</span></li><li><strong>Open the message.</strong><span>The app prepares SMS or email. You check it and press Send.</span></li><li><strong>Add the receipt.</strong><span>The customer returns a private receipt to your original device.</span></li></ol>
  </section>`;
}

function privacyAndLimits(): string {
  return `<section class="limits" aria-labelledby="limits-title"><div><p class="eyebrow">Clear limits</p><h2 id="limits-title">A handoff tool, not another calendar</h2></div><p>Move Confirmed does not book appointments, send messages, prove carrier delivery, or replace your calendar. It keeps appointment and customer data in this browser. Shared cards exclude the customer’s phone number and email address.</p></section>`;
}

function createdPanel(record: ChangeRecord, settings: BusinessSettings, unlocked: boolean): string {
  const url = cardUrl(record);
  const state = record.type === 'cancelled' ? 'has been cancelled' : `has moved to ${humanDate(record.newStart!)}`;
  const defaultMessage = `Hi ${record.customerName}, your ${record.title} ${state}. Please review and acknowledge: ${url}`;
  const message = unlocked && settings.messageTemplate
    ? settings.messageTemplate
      .replaceAll('{customer}', record.customerName)
      .replaceAll('{appointment}', record.title)
      .replaceAll('{change}', state)
      .replaceAll('{link}', url)
    : defaultMessage;
  const phoneRecipient = normalizePhone(record.customerPhone);
  const emailRecipient = validEmail(record.customerEmail) ? record.customerEmail.trim() : null;
  const sms = phoneRecipient ? `sms:${phoneRecipient}?body=${encodeURIComponent(message)}` : '';
  const email = emailRecipient ? `mailto:${encodeURIComponent(emailRecipient)}?subject=${encodeURIComponent(`Change to ${record.title}`)}&body=${encodeURIComponent(message)}` : '';
  return `<section class="dispatch-panel" id="dispatch" aria-labelledby="dispatch-title">
    <div class="dispatch-stamp" aria-hidden="true">READY</div>
    <p class="eyebrow">Card prepared</p><h2 id="dispatch-title">Send the change through the customer’s composer.</h2>
    <p>We can open the message; you stay in control and press Send. Opening a composer is logged as a notification attempt, not claimed as delivery.</p>
    <div class="dispatch-actions">
      ${sms ? `<a class="primary notify-link" data-channel="sms" data-id="${esc(record.id)}" href="${esc(sms)}">Open SMS ${icon('arrow')}</a>` : ''}
      ${email ? `<a class="secondary notify-link" data-channel="email" data-id="${esc(record.id)}" href="${esc(email)}">Open email</a>` : ''}
      <button class="secondary copy-card" data-id="${esc(record.id)}" type="button">Copy confirmation link</button>
    </div>
    <label class="link-label" for="card-link">Private card link</label><div class="copy-field"><input id="card-link" readonly value="${esc(url)}" /><button class="text-button copy-card" data-id="${esc(record.id)}" type="button">Copy</button></div>
    ${statusSteps(record)}
  </section>`;
}

function formMarkup(settings: BusinessSettings): string {
  const expiry = new Date(Date.now() + 7 * 86_400_000);
  return `<section class="workbench" id="create" aria-labelledby="create-title">
    <div class="section-intro"><p class="eyebrow">Prepare the handoff</p><h2 id="create-title">What changed?</h2><p>Import one calendar event or enter it manually. Fields marked * are required. Customer contact details stay in this browser.</p></div>
    <form id="change-form" novalidate>
      <div id="form-error" class="form-alert" role="alert" tabindex="-1" hidden></div>
      <fieldset class="type-switch"><legend>Change type *</legend>
        <label><input type="radio" name="type" value="rescheduled" checked /><span>Rescheduled</span></label>
        <label><input type="radio" name="type" value="cancelled" /><span>Cancelled</span></label>
      </fieldset>
      <div class="import-row"><label class="file-button" for="ics-file">${icon('download')} Import .ics event</label><input id="ics-file" type="file" accept=".ics,text/calendar" /><span id="ics-status">Optional — reads the first event only.</span></div>
      <div class="form-grid">
        <label class="wide">Appointment name *<input name="title" required autocomplete="off" placeholder="e.g. Piano lesson" /></label>
        <label>Customer first name *<input name="customerName" required autocomplete="given-name" /></label>
        <label>Customer mobile<input name="customerPhone" type="tel" autocomplete="tel" inputmode="tel" /></label>
        <label>Customer email<input name="customerEmail" type="email" autocomplete="email" /></label>
        <p class="field-hint wide">Add at least one customer contact so you can open their composer.</p>
        <label>Original time *<input name="oldStart" type="datetime-local" required /></label>
        <label id="new-time-label">New time *<input name="newStart" type="datetime-local" required /></label>
        <label class="wide">Location<input name="location" autocomplete="street-address" /></label>
        <label class="wide">Note for the customer<textarea name="note" rows="3" maxlength="280" placeholder="Parking, call link, or what stays the same"></textarea></label>
      </div>
      <div class="form-divider"><span>Your return route</span></div>
      <div class="form-grid">
        <label>Business name *<input name="businessName" required value="${esc(settings.businessName)}" autocomplete="organization" /></label>
        <label>Your mobile<input name="replyPhone" type="tel" value="${esc(settings.replyPhone)}" autocomplete="tel" inputmode="tel" /></label>
        <label>Your email<input name="replyEmail" type="email" value="${esc(settings.replyEmail)}" autocomplete="email" /></label>
        <label>Link expires *<input name="expiresAt" type="datetime-local" value="${toLocalInput(expiry.toISOString())}" required /></label>
        <p class="field-hint wide">Add at least one return contact. The customer sends the acknowledgement receipt back there. Links should expire after the appointment.</p>
      </div>
      <button class="primary submit-change" type="submit">Create confirmation card ${icon('arrow')}</button>
    </form>
  </section>`;
}

function dataTools(): string {
  return `<section class="data-tools" aria-labelledby="data-title"><div><p class="eyebrow">Your records, your device</p><h2 id="data-title">Carry your log with you.</h2><p>Export anytime. Import replaces the current local log only after you confirm.</p></div><div class="tool-actions"><button id="export-json" class="secondary" type="button" aria-label="Export local log as JSON">Export JSON</button><button id="export-csv" class="secondary" type="button" aria-label="Export local log as CSV">Export CSV</button><label for="import-json" class="file-button">Import JSON</label><input id="import-json" type="file" accept="application/json,.json" /></div></section>`;
}

function plusMarkup(settings: BusinessSettings, unlocked: boolean, demoPreview = false): string {
  const cachedVerdict = getCachedVerdict();
  const licenseStatus = !getLicense()
    ? ''
    : cachedVerdict && !cachedVerdict.valid
      ? 'License no longer active. Free tools remain available.'
      : 'A saved license needs verification.';
  return `<section class="plus-section" aria-labelledby="plus-title">
    <div><p class="eyebrow">Optional one-time upgrade</p><h2 id="plus-title">Move Confirmed Plus — $29 once</h2><p>The free change card, acknowledgement receipt, offline log, and all exports stay free. Plus saves reusable business defaults and a custom message template. No subscription.</p></div>
    ${unlocked ? `<form id="settings-form" class="plus-settings"><span class="state-badge confirmed">${demoPreview ? 'Demo · Plus preview' : '✓ Plus unlocked'}</span>
      <label>Default business name<input name="businessName" value="${esc(settings.businessName)}" /></label>
      <label>Default reply mobile<input name="replyPhone" type="tel" value="${esc(settings.replyPhone)}" /></label>
      <label>Default reply email<input name="replyEmail" type="email" value="${esc(settings.replyEmail)}" /></label>
      <label>Message template<textarea name="messageTemplate" rows="4" placeholder="Hi {customer}, your {appointment} has changed. Review: {link}">${esc(settings.messageTemplate)}</textarea></label>
      <p class="field-hint">Available placeholders: {customer}, {appointment}, {change}, {link}.</p><button class="primary" type="submit" aria-label="Save Plus defaults">Save Plus defaults</button></form>` : `<div class="unlock-panel">${icon('lock')}<p>One payment unlocks Plus on your devices. Checkout is hosted by Sociobot/Dodo, the merchant of record.</p><a class="primary" href="${buyUrl()}">Buy Plus for $29</a><form id="license-form"><label for="license">Have a license? Paste it here</label><div class="copy-field"><input id="license" name="license" autocomplete="off" required /><button class="secondary" type="submit" aria-label="Restore pasted license">Restore</button></div><p id="license-status" class="field-hint" aria-live="polite">${licenseStatus}</p></form></div>`}
  </section>`;
}

async function renderOwner(): Promise<void> {
  const renderVersion = ++ownerRenderVersion;
  if (DEMO_MODE) await ensureDemoData();
  const [records, settings] = await Promise.all([getRecords(), getSettings()]);
  const unlocked = !DEMO_MODE && cachedUnlocked();
  const heroFacts = `<ul class="hero-facts"><li><strong>Private</strong><span>Customer contacts stay on this device.</span></li><li><strong>Offline</strong><span>Your saved log opens after the first visit.</span></li><li><strong>Price</strong><span>Core tools are free. Plus is $29 once.</span></li></ul>`;
  const heroActions = DEMO_MODE
    ? `<div class="hero-actions"><a class="primary" href="#history">View the sample log ${icon('arrow')}</a><span>Three sample changes show prepared, notified, and confirmed states.</span><a class="secondary" href="#create">Try a new change</a></div>`
    : `<div class="hero-actions"><a class="primary" href="/demo">Try it with sample data ${icon('arrow')}</a><span>See three realistic changes in a separate demo log.</span><a class="secondary" href="#create">Prepare your change</a></div>`;
  app.innerHTML = shell(`
    <section class="hero"><div class="hero-copy"><p class="route-kicker"><span>OLD TIME</span><i aria-hidden="true"></i><span>NEW TIME</span></p><h1>Make appointment changes clear and confirmed.</h1><p class="hero-lede">For one-person appointment businesses: send a private change card and keep the customer’s receipt beside your calendar.</p>${heroActions}${heroFacts}</div><figure class="hero-art"><picture><source srcset="/assets/move-confirmed-hero-768.webp 768w, /assets/move-confirmed-hero-1280.webp 1280w" sizes="(max-width: 760px) 100vw, 48vw" type="image/webp" /><img src="/assets/move-confirmed-hero-1280.webp" width="1280" height="853" fetchpriority="high" decoding="async" alt="Two stylized station clocks connected by a red and teal route ending in a confirmation seal" /></picture><figcaption>From changed stop to confirmed arrival.</figcaption></figure></section>
    ${dashboard(records)}
    <div id="owner-lower" class="owner-lower" aria-busy="true"></div>
  `);
  document.title = DEMO_MODE ? 'Demo — Move Confirmed' : 'Move Confirmed — Proof for changed appointments';
  const canonicalUrl = `https://reschedule-proof.sociobot.in${DEMO_MODE ? '/demo' : '/'}`;
  document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute('href', canonicalUrl);
  document.querySelector<HTMLMetaElement>('meta[property="og:url"]')?.setAttribute('content', canonicalUrl);
  document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.setAttribute('content', document.title);
  document.querySelector<HTMLMetaElement>('meta[name="twitter:title"]')?.setAttribute('content', document.title);
  bindCommon();
  const lower = document.querySelector<HTMLElement>('#owner-lower');
  if (!lower) return;
  const stages = [
    `${lastCreated ? createdPanel(lastCreated, settings, unlocked) : ''}${howItWorks()}`,
    formMarkup(unlocked ? settings : { businessName: '', replyPhone: '', replyEmail: '', messageTemplate: '' }),
    `<section class="history" id="history" aria-labelledby="history-title"><div class="section-intro"><p class="eyebrow">Local proof log</p><h2 id="history-title">Change history</h2><p>Customer contact details never appear in shared card links.</p></div>${recordList(records)}</section>${dataTools()}`,
    `${privacyAndLimits()}${plusMarkup(settings, DEMO_MODE || unlocked, DEMO_MODE)}`
  ];
  for (const stage of stages) {
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
    if (renderVersion !== ownerRenderVersion) return;
    lower.insertAdjacentHTML('beforeend', stage);
  }
  lower.removeAttribute('aria-busy');
  bindOwner(records);
  if (['#create', '#how', '#history'].includes(location.hash)) document.querySelector<HTMLElement>(location.hash)?.scrollIntoView();
  if (!DEMO_MODE && getLicense() && !licenseReconciled && !licenseReconciling) void reconcileLicense();
}

function validCard(payload: CardPayload): boolean {
  return payload?.v === 1 && Boolean(payload.id && payload.token && payload.title && payload.oldStart && payload.expiresAt);
}

function cardState(payload: CardPayload): string {
  if (payload.type === 'cancelled') return `<div class="change-line cancelled"><div><span>Was scheduled</span><strong>${humanDate(payload.oldStart)}</strong></div><span class="route-arrow">×</span><div><span>Now</span><strong>Cancelled</strong></div></div>`;
  return `<div class="change-line"><div><span>Old time</span><strong>${humanDate(payload.oldStart)}</strong></div><span class="route-arrow">${icon('arrow')}</span><div><span>New time</span><strong>${humanDate(payload.newStart!)}</strong></div></div>`;
}

function renderCard(encoded: string): void {
  try {
    const payload = decodePayload<CardPayload>(encoded);
    if (!validCard(payload)) throw new Error('Missing card fields.');
    const expired = Date.now() > new Date(payload.expiresAt).getTime();
    app.innerHTML = shell(`<section class="customer-page"><div class="customer-ticket">
      <p class="eyebrow">A change from ${esc(payload.businessName)}</p><h1>${expired ? 'This confirmation link has expired.' : `Hi ${esc(payload.customerName)}, please check this change.`}</h1>
      ${expired ? `<div class="expired-note">${icon('signal')}<p>For your privacy, this link expired on ${humanDate(payload.expiresAt)}. Contact ${esc(payload.businessName)} directly to confirm the appointment.</p></div>` : `<div class="appointment-title"><span>${payload.type === 'cancelled' ? 'Cancellation' : 'Reschedule'}</span><h2>${esc(payload.title)}</h2></div>${cardState(payload)}${payload.location ? `<p class="card-detail"><strong>Location</strong>${esc(payload.location)}</p>` : ''}${payload.note ? `<p class="card-detail"><strong>Note</strong>${esc(payload.note)}</p>` : ''}<button id="acknowledge" class="primary acknowledge" type="button">I’ve seen this change ${icon('check')}</button><p class="privacy-note">This sends nothing automatically. You’ll choose SMS or email to return a timestamped receipt.</p><div id="receipt-actions"></div>`}
      <p class="expiry">Private link · Expires ${humanDate(payload.expiresAt)}</p></div><a class="customer-home" href="/">What is Move Confirmed?</a></section>`, 'customer');
    bindCommon();
    focusPageHeading();
    document.querySelector('#acknowledge')?.addEventListener('click', () => {
      if (Date.now() > new Date(payload.expiresAt).getTime()) void route();
      else showReceiptActions(payload);
    });
  } catch {
    app.innerHTML = shell(`<section class="customer-page"><div class="customer-ticket error-ticket">${icon('signal')}<h1>This change card can’t be read.</h1><p>The link may be incomplete. Ask the business to send a fresh confirmation link.</p></div><a class="customer-home" href="/">Open Move Confirmed</a></section>`, 'customer');
    bindCommon();
    focusPageHeading();
  }
}

function showReceiptActions(payload: CardPayload): void {
  const receipt: ReceiptPayload = { v: 1, id: payload.id, token: payload.token, acknowledgedAt: new Date().toISOString() };
  const url = receiptUrl(receipt);
  const message = `Acknowledged: ${payload.title} change at ${humanDate(receipt.acknowledgedAt)}. Add the receipt to your Move Confirmed log: ${url}`;
  const target = document.querySelector<HTMLElement>('#receipt-actions');
  if (!target) return;
  const replyPhone = normalizePhone(payload.replyPhone);
  const replyEmail = validEmail(payload.replyEmail) ? payload.replyEmail!.trim() : null;
  target.innerHTML = `<div class="receipt-ready"><span class="punch-stamp">SEEN</span><h2>Receipt ready</h2><p>Return it to ${esc(payload.businessName)} so their local log can mark this change acknowledged.</p><div class="dispatch-actions">${replyPhone ? `<a class="primary" href="sms:${replyPhone}?body=${encodeURIComponent(message)}">Text receipt ${icon('arrow')}</a>` : ''}${replyEmail ? `<a class="secondary" href="mailto:${encodeURIComponent(replyEmail)}?subject=${encodeURIComponent(`Acknowledged: ${payload.title}`)}&body=${encodeURIComponent(message)}">Email receipt</a>` : ''}<button id="copy-receipt" class="secondary" type="button">Copy receipt link</button></div></div>`;
  document.querySelector<HTMLButtonElement>('#acknowledge')!.disabled = true;
  document.querySelector('#copy-receipt')?.addEventListener('click', async () => {
    await copyText(url); announce('Acknowledgement receipt link copied.');
  });
  target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  announce('Acknowledgement receipt is ready to return.');
}

async function renderReceipt(encoded: string): Promise<void> {
  try {
    const receipt = decodePayload<ReceiptPayload>(encoded);
    if (receipt?.v !== 1 || !receipt.id || !receipt.token || !receipt.acknowledgedAt) throw new Error('Invalid receipt');
    const record = await getRecord(receipt.id);
    const verdict = receiptVerdict(record, receipt);
    const valid = verdict === 'valid';
    const matchedRecord = valid ? record! : undefined;
    const title = valid ? 'The receipt matches your local change.' : verdict === 'expired' ? 'This confirmation card has expired.' : 'This receipt does not match this device.';
    const failure = verdict === 'expired'
      ? 'The acknowledgement arrived after the card’s privacy deadline, so the local proof log was not changed. Create and send a fresh card if confirmation is still needed.'
      : 'Open this link on the device that created the original card. No matching customer record was imported or created.';
    app.innerHTML = shell(`<section class="receipt-import"><p class="eyebrow">Incoming acknowledgement</p><h1>${title}</h1>${matchedRecord ? `<div class="receipt-preview"><span class="punch-stamp">SEEN</span><h2>${esc(matchedRecord.title)}</h2><p>${esc(matchedRecord.customerName)} · ${humanDate(receipt.acknowledgedAt)}</p></div><button id="import-receipt" class="primary" type="button">Add acknowledgement to log ${icon('check')}</button><p>The receipt timestamp and verification token will be kept in this browser.</p>` : `<div class="expired-note">${icon('signal')}<p>${failure}</p></div>`}<a class="inline-action" href="#/">Return to local log ${icon('arrow')}</a></section>`);
    bindCommon();
    focusPageHeading();
    document.querySelector('#import-receipt')?.addEventListener('click', async () => {
      const currentRecord = await getRecord(receipt.id);
      if (receiptVerdict(currentRecord, receipt) !== 'valid' || !currentRecord) {
        await renderReceipt(encoded);
        return;
      }
      currentRecord.acknowledgement = { at: receipt.acknowledgedAt, method: 'receipt' };
      await saveRecord(currentRecord);
      history.replaceState({}, '', `${location.pathname}#/`);
      lastCreated = null;
      await renderOwner();
      announce('Acknowledgement added to the local log.');
    });
  } catch {
    app.innerHTML = shell(`<section class="receipt-import"><h1>This acknowledgement receipt is incomplete.</h1><p>Ask the customer to use the original card again and return a fresh receipt.</p><a class="inline-action" href="#/">Return to local log ${icon('arrow')}</a></section>`);
    bindCommon();
    focusPageHeading();
  }
}

function bindCommon(): void {
  const updateNetwork = () => {
    const status = document.querySelector<HTMLElement>('#network-status');
    if (status) status.innerHTML = `<span aria-hidden="true">●</span> <span>${navigator.onLine ? 'Online' : 'Offline ready'}</span>`;
  };
  window.addEventListener('online', updateNetwork, { once: true });
  window.addEventListener('offline', updateNetwork, { once: true });
  const install = document.querySelector<HTMLButtonElement>('#install-button');
  if (installPrompt && install) install.hidden = false;
  install?.addEventListener('click', async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') install.hidden = true;
    installPrompt = null;
  });
  document.querySelector('#reset-demo')?.addEventListener('click', async () => {
    await resetDemoData();
    lastCreated = null;
    await renderOwner();
    announce('Demo reset to the original sample changes.');
  });
  document.querySelector('#start-real')?.addEventListener('click', async () => {
    try { await discardDemoData(); } catch { /* A second demo tab may still hold the temporary database. */ }
    location.assign('/');
  });
}

function download(name: string, content: string, type: string): void {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([content], { type }));
  link.download = name;
  link.click();
  URL.revokeObjectURL(link.href);
}

function bindOwner(records: ChangeRecord[]): void {
  const form = document.querySelector<HTMLFormElement>('#change-form');
  const typeInputs = document.querySelectorAll<HTMLInputElement>('input[name="type"]');
  typeInputs.forEach((input) => input.addEventListener('change', () => {
    const cancelled = input.checked && input.value === 'cancelled';
    if (!cancelled && input.value !== 'rescheduled') return;
    const label = document.querySelector<HTMLElement>('#new-time-label');
    const field = form?.elements.namedItem('newStart') as HTMLInputElement;
    if (label) label.hidden = cancelled;
    if (field) field.required = !cancelled;
  }));
  document.querySelector<HTMLInputElement>('#ics-file')?.addEventListener('change', async (event) => {
    const file = (event.currentTarget as HTMLInputElement).files?.[0];
    if (!file || !form) return;
    const status = document.querySelector<HTMLElement>('#ics-status');
    try {
      const parsed = parseIcs(await file.text());
      (form.elements.namedItem('title') as HTMLInputElement).value = parsed.title;
      (form.elements.namedItem('oldStart') as HTMLInputElement).value = toLocalInput(parsed.start);
      (form.elements.namedItem('location') as HTMLInputElement).value = parsed.location;
      (form.elements.namedItem('note') as HTMLTextAreaElement).value = parsed.note.slice(0, 280);
      if (status) status.textContent = `Imported “${parsed.title}”. Check the time before continuing.`;
      announce('Calendar event imported.');
    } catch (error) {
      if (status) status.textContent = error instanceof Error ? error.message : 'This calendar file could not be read.';
    }
  });
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const error = document.querySelector<HTMLElement>('#form-error');
    if (!form.checkValidity()) {
      if (error) { error.hidden = false; error.textContent = 'Complete the required fields, then create the card again.'; }
      form.reportValidity(); return;
    }
    const data = new FormData(form);
    const phone = String(data.get('customerPhone') ?? '').trim();
    const email = String(data.get('customerEmail') ?? '').trim();
    const replyPhone = String(data.get('replyPhone') ?? '').trim();
    const replyEmail = String(data.get('replyEmail') ?? '').trim();
    const type = data.get('type') === 'cancelled' ? 'cancelled' : 'rescheduled';
    const oldStart = new Date(String(data.get('oldStart')));
    const newValue = String(data.get('newStart') ?? '');
    const expiresAt = new Date(String(data.get('expiresAt')));
    let message = '';
    if (phone && !normalizePhone(phone)) message = 'Enter a valid customer mobile number with 7 to 15 digits, or clear it and use email.';
    else if (replyPhone && !normalizePhone(replyPhone)) message = 'Enter a valid return mobile number with 7 to 15 digits, or clear it and use email.';
    else if (!phone && !email) message = 'Add the customer’s mobile or email so you can open a message composer.';
    else if (!replyPhone && !replyEmail) message = 'Add your mobile or email so the customer can return their acknowledgement.';
    else if (type === 'rescheduled' && (!newValue || new Date(newValue).getTime() === oldStart.getTime())) message = 'Choose a new time that differs from the original time.';
    else if (expiresAt.getTime() <= Date.now()) message = 'Choose a link expiry in the future.';
    if (message) { if (error) { error.hidden = false; error.textContent = message; error.focus(); } return; }
    const record: ChangeRecord = {
      id: crypto.randomUUID(), token: randomToken(), type,
      title: String(data.get('title')).trim(), customerName: String(data.get('customerName')).trim(),
      customerPhone: normalizePhone(phone) ?? '', customerEmail: email, oldStart: oldStart.toISOString(),
      newStart: type === 'rescheduled' ? new Date(newValue).toISOString() : undefined,
      location: String(data.get('location') ?? '').trim() || undefined,
      note: String(data.get('note') ?? '').trim() || undefined,
      businessName: String(data.get('businessName')).trim(), replyPhone: normalizePhone(replyPhone) ?? undefined,
      replyEmail: replyEmail || undefined, createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(), notifications: []
    };
    await saveRecord(record);
    lastCreated = record;
    await renderOwner();
    document.querySelector('#dispatch')?.scrollIntoView({ behavior: 'smooth' });
    announce('Confirmation card created and saved locally.');
  });
  document.querySelectorAll<HTMLAnchorElement>('.notify-link').forEach((element) => element.addEventListener('click', async (event) => {
    event.preventDefault();
    const logged = await logNotification(element.dataset.id!, element.dataset.channel as NotifyChannel);
    if (!logged) { announce('That recipient is not valid. Edit the contact and create a fresh card.'); return; }
    location.href = element.href;
  }));
  document.querySelectorAll<HTMLButtonElement>('.copy-card').forEach((button) => button.addEventListener('click', async () => {
    const record = await getRecord(button.dataset.id!); if (!record) return;
    await copyText(cardUrl(record));
    await logNotification(record.id, 'copy'); announce('Private card link copied; copy attempt logged.');
  }));
  document.querySelectorAll<HTMLButtonElement>('.share-record').forEach((button) => button.addEventListener('click', async () => {
    lastCreated = await getRecord(button.dataset.id!) ?? null; await renderOwner(); document.querySelector('#dispatch')?.scrollIntoView({ behavior: 'smooth' });
  }));
  document.querySelectorAll<HTMLButtonElement>('.manual-record').forEach((button) => button.addEventListener('click', async () => {
    const record = await getRecord(button.dataset.id!); if (!record) return;
    if (!confirm(`Mark “${record.title}” for ${record.customerName} acknowledged manually? The log will label this as manual, not a customer receipt.`)) return;
    record.acknowledgement = { at: new Date().toISOString(), method: 'manual' }; await saveRecord(record); await renderOwner(); announce('Manual acknowledgement added.');
  }));
  document.querySelectorAll<HTMLButtonElement>('.delete-record').forEach((button) => button.addEventListener('click', async () => {
    const record = await getRecord(button.dataset.id!); if (!record) return;
    if (!confirm(`Delete “${record.title}” for ${record.customerName}? This permanently removes its local proof trail.`)) return;
    await deleteRecord(record.id); if (lastCreated?.id === record.id) lastCreated = null; await renderOwner(); announce('Change record deleted.');
  }));
  document.querySelector('#export-json')?.addEventListener('click', () => download('move-confirmed-backup.json', JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), records }, null, 2), 'application/json'));
  document.querySelector('#export-csv')?.addEventListener('click', () => download('move-confirmed-log.csv', recordsToCsv(records), 'text/csv'));
  document.querySelector<HTMLInputElement>('#import-json')?.addEventListener('change', async (event) => {
    const file = (event.currentTarget as HTMLInputElement).files?.[0]; if (!file) return;
    try {
      const payload = JSON.parse(await file.text()) as { version: number; records: ChangeRecord[] };
      if (payload.version !== 1 || !validBackupRecords(payload.records)) throw new Error('Unsupported backup');
      if (!confirm(`Replace this device’s current ${records.length} records with ${payload.records.length} imported records?`)) return;
      await replaceRecords(payload.records); await renderOwner(); announce('Backup imported into the local log.');
    } catch { announce('That file is not a valid Move Confirmed backup.'); }
  });
  document.querySelector<HTMLFormElement>('#license-form')?.addEventListener('submit', async (event) => {
    event.preventDefault(); const field = document.querySelector<HTMLInputElement>('#license'); if (!field?.value.trim()) return;
    saveLicense(field.value); const status = document.querySelector<HTMLElement>('#license-status'); if (status) status.textContent = 'Checking license…';
    try { const verdict = await verifyLicense(true); if (verdict.valid) { await renderOwner(); announce('Move Confirmed Plus unlocked.'); } else if (status) status.textContent = 'That license is not active. Check the token or buy Plus.'; }
    catch { if (status) status.textContent = 'Could not reach license verification. Your free tools still work; try again when online.'; }
  });
  document.querySelector<HTMLFormElement>('#settings-form')?.addEventListener('submit', async (event) => {
    event.preventDefault(); const data = new FormData(event.currentTarget as HTMLFormElement);
    await saveSettings({ businessName: String(data.get('businessName') ?? ''), replyPhone: String(data.get('replyPhone') ?? ''), replyEmail: String(data.get('replyEmail') ?? ''), messageTemplate: String(data.get('messageTemplate') ?? '') });
    announce('Plus defaults saved on this device.');
  });
}

async function logNotification(id: string, channel: NotifyChannel): Promise<boolean> {
  const record = await getRecord(id); if (!record) return false;
  if (channel === 'sms' && !normalizePhone(record.customerPhone)) return false;
  if (channel === 'email' && !validEmail(record.customerEmail)) return false;
  record.notifications.push({ channel, at: new Date().toISOString() }); await saveRecord(record);
  if (lastCreated?.id === record.id) lastCreated = record;
  return true;
}

async function reconcileLicense(): Promise<void> {
  if (licenseReconciled || licenseReconciling) return;
  licenseReconciling = true;
  try {
    const before = getCachedVerdict();
    const result = await verifyLicense();
    licenseReconciled = true;
    if (!before || before.valid !== result.valid) {
      await renderOwner();
      announce(result.valid ? 'Move Confirmed Plus unlocked.' : 'License no longer active. Free tools remain available.');
    }
  } catch {
    licenseReconciled = true;
    /* Offline is expected; retain the cached verdict and free experience. */
  } finally {
    licenseReconciling = false;
  }
}

async function route(focusOwner = false): Promise<void> {
  const hash = location.hash;
  if (hash.startsWith('#/card/')) { document.title = 'Appointment change — Move Confirmed'; renderCard(hash.slice('#/card/'.length)); }
  else if (hash.startsWith('#/receipt/')) { document.title = 'Acknowledgement — Move Confirmed'; await renderReceipt(hash.slice('#/receipt/'.length)); }
  else { await renderOwner(); if (focusOwner) focusPageHeading(); }
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault(); installPrompt = event as BeforeInstallPromptEvent;
  const button = document.querySelector<HTMLButtonElement>('#install-button'); if (button) button.hidden = false;
});
window.addEventListener('hashchange', () => {
  if (['#main', '#create', '#how', '#history'].includes(location.hash)) return;
  void route(true);
});

storeReturnedLicense();
void route().catch(() => {
  app.innerHTML = shell(`<section class="receipt-import"><h1>Your local log could not open.</h1><p>Reload the page. If the problem continues, export browser data before clearing site storage.</p><button id="reload-app" class="primary" type="button">Reload app</button></section>`);
  document.querySelector('#reload-app')?.addEventListener('click', () => location.reload());
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) announce('An update is ready. Reload to use it.');
        });
      });
    }).catch(() => announce('Offline setup is unavailable in this browser.'));
  });
}
