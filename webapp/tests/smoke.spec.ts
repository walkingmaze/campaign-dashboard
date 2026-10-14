import { test, expect } from '@playwright/test';

test('navigation links reach the other pages', async ({ page }) => {
  await page.goto('/campaigns');
  await page.getByRole('link', { name: 'Log change' }).click();
  await expect(page.getByRole('heading', { name: 'Log a change' })).toBeVisible();
  await page.getByRole('link', { name: 'Plant' }).click();
  await expect(page).toHaveURL(/\/tree/);
});

test('campaigns page lists a campaign with a KPI target in euro', async ({ page }) => {
  await page.goto('/campaigns');
  const firstRow = page.locator('tbody tr').first();
  await expect(firstRow).toBeVisible();
  await expect(firstRow).toContainText('€');
});

test('plant page shows the live KPI status and opens a branch', async ({ page }) => {
  await page.goto('/tree');
  await expect(page.getByLabel('Current KPI status')).toContainText(/CPM [\d.,]+€/);
  const kpiMetric = page.getByLabel('KPI metric');
  await expect(kpiMetric).toHaveValue('cpm');
  await expect(kpiMetric.locator('option')).toHaveText(['CPC', 'CPM', 'CPV', 'CPA']);
  const target = page.getByLabel('Target amount in euros');
  await expect(target).toHaveValue('1');
  const branches = page.getByRole('button', { name: / on \d{4}-\d{2}-\d{2}/ });
  await expect(branches.first()).toBeVisible();
  await branches.first().click();
  await expect(page.getByText('Before', { exact: true })).toBeVisible();
  await expect(page.getByText('After', { exact: true })).toBeVisible();
});

test('plant page rejects a negative KPI target without saving', async ({ page }) => {
  await page.goto('/tree');
  const target = page.getByLabel('Target amount in euros');
  await target.fill('-1');
  await target.press('Tab');
  await expect(page.locator('.tree-kpi-save-status[role="alert"]')).toContainText('zero or more euros');
});

test('change form blocks submit when the date is missing', async ({ page }) => {
  await page.goto('/changes');
  await page.getByRole('button', { name: 'Log this change' }).click();
  const dateMissing = await page
    .locator('input[name="change_date"]')
    .evaluate((el: HTMLInputElement) => el.validity.valueMissing);
  expect(dateMissing).toBe(true);
});

test('date range picker switches the range', async ({ page }) => {
  await page.goto('/tree');
  await page.getByRole('button', { name: /date range/i }).click();
  await page.getByRole('button', { name: 'Last 7 days' }).click();
  await expect(page).toHaveURL(/range=last7/);
  await expect(page.getByLabel('Current KPI status')).toContainText('Last 7 days');
});