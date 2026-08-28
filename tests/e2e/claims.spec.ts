import { expect, test } from '@playwright/test';

test('@claim:demo-sandbox sample data stays separate from the real log', async ({ page }) => {
  await page.goto('/demo');
  await expect(page.getByText('Piano lesson', { exact: true })).toBeVisible();
  const databases = await page.evaluate(async () => (await indexedDB.databases()).map((database) => database.name));
  expect(databases).toContain('move-confirmed-demo');
  expect(databases).not.toContain('move-confirmed');
});

test('@claim:proof-roundtrip a sample card returns an acknowledgement to its local record', async ({ page }) => {
  await page.goto('/demo');
  const bike = page.locator('[data-record-id="demo-bike"]');
  await bike.getByRole('button', { name: 'Share confirmation card' }).click();
  const link = await page.locator('#card-link').inputValue();
  expect(link).toContain('/demo#/card/');
  await page.goto(link);
  await page.getByRole('button', { name: /I’ve seen this change/ }).click();
  const receiptHref = await page.locator('a[href^="mailto:"]').getAttribute('href');
  const receiptLink = decodeURIComponent(receiptHref!.split('&body=')[1]!).match(/https?:\/\/\S+#\/receipt\/\S+/)![0];
  await page.goto(receiptLink);
  await page.getByRole('button', { name: /Add acknowledgement/ }).click();
  await expect(page.locator('[data-record-id="demo-bike"]')).toContainText('✓ Confirmed');
  await page.reload();
  await expect(page.locator('[data-record-id="demo-bike"]')).toContainText('✓ Confirmed');
});

test('@claim:contact-privacy shared cards exclude customer contacts and the demo makes no third-party HTTP requests', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => {
    if (/^https?:/.test(request.url())) requests.push(request.url());
  });
  await page.goto('/demo');
  await page.locator('[data-record-id="demo-piano"]').getByRole('button', { name: 'Share confirmation card' }).click();
  const link = await page.locator('#card-link').inputValue();
  const encoded = link.split('#/card/')[1];
  const payload = JSON.parse(Buffer.from(encoded.replaceAll('-', '+').replaceAll('_', '/'), 'base64').toString('utf8'));
  expect(payload.customerPhone).toBeUndefined();
  expect(payload.customerEmail).toBeUndefined();
  await page.goto(link);
  await expect(page.getByRole('heading', { name: /please check this change/i })).toBeVisible();
  expect(requests.every((url) => new URL(url).origin === 'http://127.0.0.1:4173')).toBe(true);
});

test('@claim:export-formats exports all sample records as JSON and CSV', async ({ page }) => {
  await page.goto('/demo');
  const [jsonDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export local log as JSON' }).click()
  ]);
  const json = JSON.parse(await (await jsonDownload.createReadStream()).toArray().then((chunks) => Buffer.concat(chunks).toString('utf8')));
  expect(json.records).toHaveLength(3);

  const [csvDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export local log as CSV' }).click()
  ]);
  const csv = await (await csvDownload.createReadStream()).toArray().then((chunks) => Buffer.concat(chunks).toString('utf8'));
  expect(csv.trim().split('\n')).toHaveLength(4);
  expect(csv).toContain('appointment,customer');
});

test('@claim:calendar-import imports the first calendar event into the change form', async ({ page }) => {
  await page.goto('/demo');
  await page.locator('#ics-file').setInputFiles({
    name: 'guitar-tune-up.ics',
    mimeType: 'text/calendar',
    buffer: Buffer.from('BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nDTSTART:20260904T143000Z\r\nSUMMARY:Guitar tune-up\r\nLOCATION:Rear workshop\r\nDESCRIPTION:Bring the hard case\r\nEND:VEVENT\r\nEND:VCALENDAR')
  });
  await expect(page.getByLabel('Appointment name')).toHaveValue('Guitar tune-up');
  await expect(page.getByLabel('Location')).toHaveValue('Rear workshop');
  await expect(page.locator('#ics-status')).toContainText('Imported “Guitar tune-up”');
});

test('@claim:backup-import validates and imports a complete JSON backup', async ({ page }) => {
  await page.goto('/demo');
  const now = Date.now();
  const record = {
    id: 'imported-demo', token: 'imported-demo-token', type: 'cancelled', title: 'Window cleaning',
    customerName: 'Sam', customerPhone: '+15550102030', customerEmail: '',
    oldStart: new Date(now + 86_400_000).toISOString(), businessName: 'Clear Day Windows',
    replyEmail: 'owner@example.test', createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + 172_800_000).toISOString(), notifications: []
  };
  page.on('dialog', (dialog) => dialog.accept());
  await page.locator('#import-json').setInputFiles({
    name: 'move-confirmed-backup.json', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ version: 1, records: [record] }))
  });
  await expect(page.getByText('Window cleaning', { exact: true })).toBeVisible();
  await expect(page.locator('.record')).toHaveCount(1);
});

test('@claim:expiring-links an expired sample card cannot create a receipt', async ({ page }) => {
  await page.goto('/demo');
  await page.locator('[data-record-id="demo-groom"]').getByRole('button', { name: 'Share confirmation card' }).click();
  const link = await page.locator('#card-link').inputValue();
  const encoded = link.split('#/card/')[1];
  const payload = JSON.parse(Buffer.from(encoded.replaceAll('-', '+').replaceAll('_', '/'), 'base64').toString('utf8'));
  payload.expiresAt = new Date(Date.now() - 1_000).toISOString();
  const expired = Buffer.from(JSON.stringify(payload)).toString('base64url');
  await page.goto(`/demo#/card/${expired}`);
  await expect(page.getByRole('heading', { name: /expired/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /I’ve seen this change/ })).toHaveCount(0);
});

test('@claim:plus-once Plus states its one-time price and supports verified reusable defaults', async ({ page }) => {
  await page.goto('/demo');
  await expect(page.getByRole('heading', { name: 'Move Confirmed Plus — $29 once' })).toBeVisible();
  await expect(page.getByText('No subscription.')).toBeVisible();
  await expect(page.getByText('Demo · Plus preview')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save Plus defaults' })).toBeVisible();
  await page.getByLabel('Default business name').fill('Harbor Music');
  await page.getByRole('button', { name: 'Save Plus defaults' }).click();
  await page.reload();
  await expect(page.getByLabel('Default business name')).toHaveValue('Harbor Music');
});
