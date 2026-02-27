import { expect, test } from '@playwright/test';

async function mockAuthApis(page: import('@playwright/test').Page) {
  let currentUser:
    | {
        id: string;
        email: string;
        role: 'developer' | 'investor' | 'compliance_officer' | 'operations';
        institutionId: null;
        mfaEnabled: false;
      }
    | null = null;

  await page.route('**/api/v1/auth/login', async (route) => {
    const body = route.request().postDataJSON() as { email?: string; password?: string };
    const email = (body.email ?? '').toLowerCase();

    const role = email.includes('admin')
      ? 'operations'
      : email.includes('owner')
      ? 'developer'
      : email.includes('trader')
      ? 'investor'
      : 'investor';

    currentUser = {
      id: 'u-1',
      email,
      role,
      institutionId: null,
      mfaEnabled: false,
    };

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: 'token-123',
        refreshToken: 'refresh-123',
        user: currentUser,
        requiresMFA: false,
      }),
    });
  });

  await page.route('**/api/v1/auth/me', async (route) => {
    if (!currentUser) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ title: 'Unauthorized' }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: currentUser }),
    });
  });

  await page.route('**/api/v1/auth/logout', async (route) => {
    currentUser = null;
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

async function loginAs(page: import('@playwright/test').Page, email: string) {
  await mockAuthApis(page);
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/(select-role|(owner|investor|trader|admin)\/home)$/);
}

test.describe('UI login and persona workflows', () => {
  test('Project Owner workflow executes end-to-end', async ({ page }) => {
    await loginAs(page, 'owner@uat.local');
    await page.goto('/owner/home');
    await expect(page.getByText('Chain: Connected')).toBeVisible();
    await page.getByRole('button', { name: 'Mock Disconnect' }).click();
    await expect(page.getByText('Chain: Disconnected')).toBeVisible();

    await page.goto('/owner/projects');
    await expect(page.getByRole('heading', { name: 'Projects', level: 2 })).toBeVisible();

    await page.getByRole('button', { name: /Project Name: Sonoran Solar \+ Storage/i }).click();
    await expect(page.getByRole('complementary', { name: 'Quick inspect drawer' })).toBeVisible();

    await page.getByRole('link', { name: 'Enter Dataroom' }).click();
    await expect(page).toHaveURL(/\/owner\/dataroom\//);

    await page.goto('/owner/negotiations/deal-1001');
    await expect(page.getByRole('heading', { name: /DealRoom/i })).toBeVisible();
    await page.getByRole('button', { name: 'Submit' }).click();
    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByText(/Submit recorded with optimistic timeline update/i)).toBeVisible();

    await page.goto('/owner/wallet');
    await expect(page.getByRole('heading', { name: 'Owner Wallet' })).toBeVisible();
  });

  test('Investor workflow executes end-to-end', async ({ page }) => {
    await loginAs(page, 'investor@uat.local');

    await page.goto('/investor/marketplace');
    await expect(page.getByRole('heading', { name: 'Investor Marketplace' })).toBeVisible();
    await expect(page.getByText('Loan Tokens', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: /Project Name: East Java Mangrove Restoration/i }).click();
    await expect(page.getByRole('link', { name: 'Request Access' })).toBeVisible();
    await page.getByRole('link', { name: 'Request Access' }).click();
    await expect(page).toHaveURL(/\/investor\/dataroom\//);

    await page.goto('/investor/deals/deal-1001');
    await page.getByRole('button', { name: 'Accept' }).click();
    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByText(/Accept recorded with optimistic timeline update/i)).toBeVisible();

    await page.goto('/investor/wallet');
    await expect(page.getByRole('heading', { name: 'Investor Wallet' })).toBeVisible();
  });

  test('Trader workflow executes end-to-end', async ({ page }) => {
    await loginAs(page, 'trader@uat.local');

    await page.goto('/trader/market');
    await expect(page.getByRole('heading', { name: 'Carbon Market Inventory' })).toBeVisible();

    await page.getByRole('button', { name: 'Request Quote' }).first().click();
    await page.getByRole('button', { name: 'Create RFQ' }).click();
    await expect(page.getByText('1 active RFQ(s)')).toBeVisible();

    await page.goto('/trader/settlement');
    await page.getByRole('button', { name: 'Open Settlement Wizard' }).click();
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Settle', exact: true }).click();
    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByText(/Tx Hash:/i)).toBeVisible();
  });

  test('Admin workflow executes end-to-end', async ({ page }) => {
    await loginAs(page, 'admin@uat.local');

    await page.goto('/admin/onboarding');
    await expect(page.getByRole('heading', { name: 'Admin Onboarding Queue' })).toBeVisible();

    await page.goto('/admin/onboarding/app-9001');
    await page.getByPlaceholder('Decision reason (required)').fill('Manual review complete');
    await page.getByRole('button', { name: 'Approve' }).click();
    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.locator('li', { hasText: /APPROVE · reason: Manual review complete/i })).toBeVisible();

    await page.goto('/admin/system-health');
    await expect(page.getByRole('heading', { name: 'System Health', level: 2 })).toBeVisible();
  });
});
