import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

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

test('has no serious accessibility violations', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact ?? ''))).toEqual([]);
});

test('app shell and local log work offline after installation', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: /appointment moved/i })).toBeVisible();
  await expect(page.getByText('Offline ready')).toBeVisible();
});
