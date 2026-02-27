import { expect, test } from '@playwright/test';

import { get, post } from './helpers/http-client';
import { createMockPlatformServer, MockPlatformServer } from './helpers/mock-platform-server';

test.describe('Deposit trade and withdrawal flow', () => {
  let server: MockPlatformServer;

  test.beforeAll(async ({ request }) => {
    server = await createMockPlatformServer();
    await post(request, server.baseUrl, '/institutions/onboard', {
      name: 'Custody Institution',
      country: 'US',
    });
    await post(request, server.baseUrl, '/assets', {
      symbol: 'CO2-DEC',
      institutionId: 'inst-1',
    });
    await post(request, server.baseUrl, '/assets/asset-1/verify', {});
  });

  test.afterAll(async () => {
    await server.stop();
  });

  test('deposits funds into wallet', async ({ request }) => {
    const response = await post(request, server.baseUrl, '/wallet/deposit', {
      account: 'acct-custody',
      amount: 5000,
    });

    expect(response.status()).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ balance: 5000 });
  });

  test('rejects non-positive deposit amount', async ({ request }) => {
    const response = await post(request, server.baseUrl, '/wallet/deposit', {
      account: 'acct-custody',
      amount: -5,
    });

    expect(response.status()).toBe(400);
  });

  test('does not allow withdrawals above balance', async ({ request }) => {
    const response = await post(request, server.baseUrl, '/wallet/withdraw', {
      account: 'acct-custody',
      amount: 6000,
    });

    expect(response.status()).toBe(409);
  });

  test('full flow: deposit to trade to withdrawal', async ({ request }) => {
    await post(request, server.baseUrl, '/rfqs', {
      account: 'acct-custody',
      assetId: 'asset-1',
      quantity: 100,
    });
    await post(request, server.baseUrl, '/rfqs/rfq-1/quotes', {
      marketMaker: 'mm-main',
      price: 12,
    });
    await post(request, server.baseUrl, '/rfqs/rfq-1/accept/quote-1', {});
    const settle = await post(request, server.baseUrl, '/trades/trade-1/settle', {});
    expect(settle.status()).toBe(200);

    const withdraw = await post(request, server.baseUrl, '/wallet/withdraw', {
      account: 'acct-custody',
      amount: 1000,
    });
    expect(withdraw.status()).toBe(200);
    await expect(withdraw.json()).resolves.toMatchObject({ balance: 2800 });
  });

  test('isolates balances across accounts', async ({ request }) => {
    await post(request, server.baseUrl, '/wallet/deposit', {
      account: 'acct-alt',
      amount: 750,
    });

    const alt = await get(request, server.baseUrl, '/wallet/acct-alt');
    const custody = await get(request, server.baseUrl, '/wallet/acct-custody');
    await expect(alt.json()).resolves.toMatchObject({ balance: 750 });
    await expect(custody.json()).resolves.toMatchObject({ balance: 2800 });
  });

  test('withdraws available funds', async ({ request }) => {
    const response = await post(request, server.baseUrl, '/wallet/withdraw', {
      account: 'acct-alt',
      amount: 250,
    });

    expect(response.status()).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ balance: 500 });
  });
});
