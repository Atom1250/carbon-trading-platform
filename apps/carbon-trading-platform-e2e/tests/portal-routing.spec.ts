import { expect, test } from '@playwright/test';

test.describe('Portal routing smoke checks', () => {
  test('renders primary portal routes', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByText('Investor Dashboard')).toBeVisible();

    await page.goto('/trading');
    await expect(page.getByRole('heading', { name: 'Carbon Marketplace (RFQ OTC)' })).toBeVisible();

    await page.goto('/admin/dashboard');
    await expect(page.getByText('Admin Command Centre')).toBeVisible();

    await page.goto('/onboarding');
    await expect(page).toHaveURL(/\/onboarding\/start$/);
    await expect(page.getByRole('heading', { name: 'Client Onboarding' })).toBeVisible();
  });

  test('redirects /figma to /dashboard when runtime is disabled', async ({ page }) => {
    await page.goto('/figma');
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});
