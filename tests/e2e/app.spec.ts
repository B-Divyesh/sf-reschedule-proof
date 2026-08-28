import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function fillChangeForm(page: Page) {
  const original = new Date(Date.now() + 86_400_000);
  const moved = new Date(original.getTime() + 3_600_000);
  const expiry = new Date(Date.now() + 2 * 86_400_000);
  const localInput = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  await page.getByLabel('Appointment name').fill('Piano lesson');
  await page.getByLabel('Customer first name').fill('Maya');
  await page.getByLabel('Customer mobile').fill('+15551234567');
  await page.getByLabel('Original time').fill(localInput(original));
  await page.getByLabel('New time').fill(localInput(moved));
  await page.getByLabel('Business name').fill('North Street Music');
  await page.getByLabel('Your mobile').fill('+15557654321');
  await page.getByLabel('Link expires').fill(localInput(expiry));
}

async function expireOnlyRecord(page: Page) {
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('move-confirmed', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = db.transaction('records', 'readwrite');
    const store = transaction.objectStore('records');
    const records = await new Promise<any[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    records[0].expiresAt = new Date(Date.now() - 60_000).toISOString();
    store.put(records[0]);
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  });
}

test('creates and shares a reschedule card', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Appointment name').fill('Piano lesson');
  await page.getByLabel('Customer first name').fill('Maya');
  await page.getByLabel('Customer mobile').fill('+15551234567');
  await page.getByLabel('Original time').fill('2026-09-04T14:30');
  await page.getByLabel('New time').fill('2026-09-05T15:00');
  await page.getByLabel('Business name').fill('North Street Music');
  await page.getByLabel('Your mobile').fill('+15557654321');
  await page.getByRole('button', { name: /Create confirmation card/ }).click();
  await expect(page.getByRole('heading', { name: /Send the change/ })).toBeVisible();
  const link = await page.locator('#card-link').inputValue();
  expect(link).toContain('#/card/');
  await page.goto(link);
  await expect(page.getByRole('heading', { name: /please check this change/i })).toBeVisible();
  await page.getByRole('button', { name: /I’ve seen this change/ }).click();
  await expect(page.getByRole('heading', { name: 'Receipt ready' })).toBeVisible();
  const smsReceipt = await page.locator('a[href^="sms:"]').getAttribute('href');
  const receiptLink = decodeURIComponent(smsReceipt!.split('?body=')[1]!).match(/https?:\/\/\S+#\/receipt\/\S+/)![0];
  await page.goto(receiptLink);
  await expect(page.getByRole('heading', { name: /receipt matches/i })).toBeVisible();
  await page.getByRole('button', { name: /Add acknowledgement/ }).click();
  await expect(page.getByText('✓ Confirmed')).toBeVisible();
});

test('has no serious accessibility violations on every public screen', async ({ page }) => {
  for (const path of ['/', '/demo', '/privacy/', '/terms/', '/404/']) {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact ?? '')), path).toEqual([]);
  }
});

test('moves keyboard focus from the skip link to the main task', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
});

test('@claim:offline-reload app shell and sample log work offline after installation', async ({ page, context }) => {
  await page.goto('/demo');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: /appointment changes clear/i })).toBeVisible();
  await expect(page.getByText('Piano lesson', { exact: true })).toBeVisible();
  await expect(page.getByText('Offline ready')).toBeVisible();
});

test('rejects a delayed genuine receipt after its local card expires', async ({ page }) => {
  await page.goto('/');
  await fillChangeForm(page);
  await page.getByRole('button', { name: /Create confirmation card/ }).click();
  const cardLink = await page.locator('#card-link').inputValue();
  await page.goto(cardLink);
  await page.getByRole('button', { name: /I’ve seen this change/ }).click();
  const smsReceipt = await page.locator('a[href^="sms:"]').getAttribute('href');
  const receiptLink = decodeURIComponent(smsReceipt!.split('?body=')[1]!).match(/https?:\/\/\S+#\/receipt\/\S+/)![0];
  await expireOnlyRecord(page);

  await page.goto(receiptLink);
  await expect(page.getByRole('heading', { name: /expired/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Add acknowledgement/ })).toHaveCount(0);
});

test('rejects a hand-crafted current receipt for an expired local card', async ({ page }) => {
  await page.goto('/');
  await fillChangeForm(page);
  await page.getByRole('button', { name: /Create confirmation card/ }).click();
  const cardLink = await page.locator('#card-link').inputValue();
  const encodedCard = cardLink.split('#/card/')[1];
  const card = JSON.parse(Buffer.from(encodedCard.replaceAll('-', '+').replaceAll('_', '/'), 'base64').toString('utf8'));
  await expireOnlyRecord(page);
  const receipt = { v: 1, id: card.id, token: card.token, acknowledgedAt: new Date().toISOString() };
  const encodedReceipt = Buffer.from(JSON.stringify(receipt)).toString('base64url');

  await page.goto(`/#/receipt/${encodedReceipt}`);
  await expect(page.getByRole('heading', { name: /expired/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Add acknowledgement/ })).toHaveCount(0);
});

test('rejects malformed customer and reply phones without creating or logging a card', async ({ page }) => {
  await page.goto('/');
  await fillChangeForm(page);
  await page.getByLabel('Customer mobile').fill('not-a-number');
  await page.getByLabel('Your mobile').fill('reply');
  await page.getByRole('button', { name: /Create confirmation card/ }).click();

  await expect(page.getByRole('alert')).toContainText('valid customer mobile');
  await expect(page.getByRole('heading', { name: /Send the change/ })).toHaveCount(0);
  await expect(page.getByText('No changes logged yet')).toBeVisible();
  await expect(page.locator('a[href^="sms:?body="]')).toHaveCount(0);
});

test('hides and disables the new time control for cancellations', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Cancelled', { exact: true }).click();
  const label = page.locator('#new-time-label');
  await expect(label).toBeHidden();
  await expect(page.getByLabel('New time')).not.toHaveAttribute('required', '');
});

test('rejects a malformed backup before confirmation and preserves the existing local proof record', async ({ page }) => {
  await page.goto('/');
  await fillChangeForm(page);
  await page.getByRole('button', { name: /Create confirmation card/ }).click();
  await expect(page.getByText('Piano lesson', { exact: true })).toBeVisible();
  let replacementConfirmationCount = 0;
  page.on('dialog', async (dialog) => { replacementConfirmationCount += 1; await dialog.dismiss(); });
  await page.locator('#import-json').setInputFiles({
    name: 'damaged-backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"version":1,"records":[{"id":"malformed-record"}]}')
  });
  await expect(page.getByRole('status')).toHaveText('That file is not a valid Move Confirmed backup.');
  expect(replacementConfirmationCount).toBe(0);
  await page.reload();
  await expect(page.getByText('Piano lesson', { exact: true })).toBeVisible();
  await expect(page.getByText('Your local log could not open.')).toHaveCount(0);
});

test('shows a persistent inactive-license notice after a returned invalid license', async ({ page }) => {
  let verificationRequests = 0;
  await page.route('https://api.sociobot.in/api/v1/products/reschedule-proof/verify?license=qa-invalid-return-token', async (route) => {
    verificationRequests += 1;
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ valid: false, reason: 'invalid' }) });
  });
  await page.goto('/?license=qa-invalid-return-token');
  await expect(page.locator('#license-status')).toHaveText('License no longer active. Free tools remain available.');
  await expect(page).not.toHaveURL(/license=/);
  const mutationCount = await page.evaluate(async () => {
    let mutations = 0;
    const observer = new MutationObserver((entries) => { mutations += entries.length; });
    observer.observe(document.querySelector('#app')!, { childList: true, subtree: true });
    await new Promise((resolve) => setTimeout(resolve, 300));
    observer.disconnect();
    return mutations;
  });
  expect(mutationCount).toBeLessThan(5);
  await fillChangeForm(page);
  await page.getByRole('button', { name: /Create confirmation card/ }).click();
  await expect(page.getByRole('heading', { name: /Send the change/ })).toBeVisible();
  expect(verificationRequests).toBe(1);
  await page.reload();
  await expect(page.locator('#license-status')).toHaveText('License no longer active. Free tools remain available.');
  await expect(page.getByText('Piano lesson', { exact: true })).toBeVisible();
  expect(verificationRequests).toBe(1);
});

test('cold first screen names the user and keeps its primary action in view', async ({ page }) => {
  if (page.viewportSize()!.width > 560) await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.getByText(/For one-person appointment businesses/)).toBeVisible();
  const action = page.getByRole('link', { name: /Try it with sample data/ });
  await expect(action).toBeVisible();
  const box = await action.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height);
});

test('demo is one click away, isolated, resettable, and discardable', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /Try it with sample data/ }).click();
  await expect(page).toHaveURL(/\/demo$/);
  await expect(page.getByLabel('Demo mode')).toContainText('nothing is saved to your real log');
  await expect(page.getByText('Piano lesson', { exact: true })).toBeVisible();
  await expect(page.getByText('Bike service pickup', { exact: true })).toBeVisible();
  const names = await page.evaluate(async () => (await indexedDB.databases()).map((database) => database.name));
  expect(names).toContain('move-confirmed-demo');
  expect(names).toContain('move-confirmed');
  const realRecordCount = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('move-confirmed', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const count = await new Promise<number>((resolve, reject) => {
      const request = database.transaction('records').objectStore('records').count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    database.close();
    return count;
  });
  expect(realRecordCount).toBe(0);

  page.on('dialog', (dialog) => dialog.accept());
  await page.locator('.delete-record').first().click();
  await expect(page.getByText('Piano lesson', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.getByText('Piano lesson', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Start for real' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByLabel('Demo mode')).toHaveCount(0);
  await expect(page.getByText('Piano lesson', { exact: true })).toHaveCount(0);
  const remainingDatabases = await page.evaluate(async () => (await indexedDB.databases()).map((database) => database.name));
  expect(remainingDatabases).not.toContain('move-confirmed-demo');
});

test('mobile skip and footer targets are at least 44 CSS pixels', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skip = await page.locator('.skip-link').boundingBox();
  const terms = await page.getByRole('contentinfo').getByRole('link', { name: 'Terms' }).boundingBox();
  for (const target of [skip, terms]) {
    expect(target).not.toBeNull();
    expect(target!.width).toBeGreaterThanOrEqual(44);
    expect(target!.height).toBeGreaterThanOrEqual(44);
  }
});
