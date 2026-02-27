import { expect, test } from '@playwright/test';

import { get, post } from './helpers/http-client';
import { createMockPlatformServer, MockPlatformServer } from './helpers/mock-platform-server';

test.describe('RFQ quote and settlement flow', () => {
  let server: MockPlatformServer;

  test.beforeAll(async ({ request }) => {
    server = await createMockPlatformServer();
    await post(request, server.baseUrl, '/institutions/onboard', {
      name: 'Trading Institution',
      country: 'US',
    });
    await post(request, server.baseUrl, '/assets', {
      symbol: 'CO2-SPOT',
      institutionId: 'inst-1',
    });
    await post(request, server.baseUrl, '/assets/asset-1/verify', {});
    await post(request, server.baseUrl, '/wallet/deposit', {
      account: 'acct-1',
      amount: 10000,
    });
  });

  test.afterAll(async () => {
    await server.stop();
  });

  test('creates RFQ for an account', async ({ request }) => {
    const response = await post(request, server.baseUrl, '/rfqs', {
      account: 'acct-1',
      assetId: 'asset-1',
      quantity: 100,
    });

    expect(response.status()).toBe(201);
    await expect(response.json()).resolves.toMatchObject({ status: 'open' });
  });

  test('requires positive RFQ quantity', async ({ request }) => {
    const response = await post(request, server.baseUrl, '/rfqs', {
      account: 'acct-1',
      assetId: 'asset-1',
      quantity: 0,
    });

    expect(response.status()).toBe(400);
  });

  test('accepts multiple quotes from market makers', async ({ request }) => {
    const quoteOne = await post(request, server.baseUrl, '/rfqs/rfq-1/quotes', {
      marketMaker: 'mm-1',
      price: 11,
    });
    const quoteTwo = await post(request, server.baseUrl, '/rfqs/rfq-1/quotes', {
      marketMaker: 'mm-2',
      price: 10.5,
    });

    expect(quoteOne.status()).toBe(201);
    expect(quoteTwo.status()).toBe(201);
    await expect(quoteTwo.json()).resolves.toMatchObject({ id: 'quote-2' });
  });

  test('rejects quote acceptance for unknown quote', async ({ request }) => {
    const response = await post(request, server.baseUrl, '/rfqs/rfq-1/accept/quote-999', {});
    expect(response.status()).toBe(404);
  });

  test('accepts quote and creates trade', async ({ request }) => {
    const response = await post(request, server.baseUrl, '/rfqs/rfq-1/accept/quote-2', {});
    expect(response.status()).toBe(201);
    await expect(response.json()).resolves.toMatchObject({ id: 'trade-1', status: 'accepted' });
  });

  test('settles accepted trade', async ({ request }) => {
    const settle = await post(request, server.baseUrl, '/trades/trade-1/settle', {});
    expect(settle.status()).toBe(200);
    const trade = await get(request, server.baseUrl, '/trades/trade-1');
    await expect(trade.json()).resolves.toMatchObject({ status: 'settled' });
  });

  test('returns not found for unknown trade', async ({ request }) => {
    const response = await get(request, server.baseUrl, '/trades/trade-999');
    expect(response.status()).toBe(404);
  });
});
