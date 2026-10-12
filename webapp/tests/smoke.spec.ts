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
  await expect(page.getByLabel('Current KPI status')).toContainText(/now .*€/);

  const branches = page.getByRole('button', { name: / on \d{4}-\d{2}-\d{2}/ });
  await expect(branches.first()).toBeVisible();
  await branches.first().click();
  await expect(page.getByText('Before', { exact: true })).toBeVisible();
  await expect(page.getByText('After', { exact: true })).toBeVisible();
});

test('change form blocks submit when the date is missing', async ({ page }) => {
  await page.goto('/changes');
  await page.getByRole('button', { name: 'Log this change' }).click();
  const dateMissing = await page
    .locator('input[name="change_date"]')
    .evaluate((el: HTMLInputElement) => el.validity.valueMissing);
  expect(dateMissing).toBe(true);
});