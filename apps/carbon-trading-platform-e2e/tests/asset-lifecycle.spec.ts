import { expect, test } from '@playwright/test';

import { post } from './helpers/http-client';
import { createMockPlatformServer, MockPlatformServer } from './helpers/mock-platform-server';

test.describe('Asset creation verification and minting flow', () => {
  let server: MockPlatformServer;

  test.beforeAll(async ({ request }) => {
    server = await createMockPlatformServer();
    await post(request, server.baseUrl, '/institutions/onboard', {
      name: 'Minting Institution',
      country: 'US',
    });
  });

  test.afterAll(async () => {
    await server.stop();
  });

  test('creates asset draft', async ({ request }) => {
    const response = await post(request, server.baseUrl, '/assets', {
      symbol: 'CO2-2026',
      institutionId: 'inst-1',
    });

    expect(response.status()).toBe(201);
    await expect(response.json()).resolves.toMatchObject({ status: 'draft', mintedSupply: 0 });
  });

  test('rejects asset creation for unknown institution', async ({ request }) => {
    const response = await post(request, server.baseUrl, '/assets', {
      symbol: 'CO2-UNKNOWN',
      institutionId: 'inst-999',
    });

    expect(response.status()).toBe(404);
  });

  test('verifies an existing asset', async ({ request }) => {
    const response = await post(request, server.baseUrl, '/assets/asset-1/verify', {});
    expect(response.status()).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: 'verified' });
  });

  test('mints verified asset supply', async ({ request }) => {
    const response = await post(request, server.baseUrl, '/assets/asset-1/mint', { amount: 1000 });
    expect(response.status()).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ mintedSupply: 1000 });
  });

  test('supports multiple mint operations', async ({ request }) => {
    const response = await post(request, server.baseUrl, '/assets/asset-1/mint', { amount: 250 });
    expect(response.status()).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ mintedSupply: 1250 });
  });

  test('rejects minting before verification', async ({ request }) => {
    await post(request, server.baseUrl, '/assets', {
      symbol: 'CO2-PENDING',
      institutionId: 'inst-1',
    });
    const response = await post(request, server.baseUrl, '/assets/asset-2/mint', { amount: 50 });
    expect(response.status()).toBe(409);
  });

  test('requires positive mint amount', async ({ request }) => {
    const response = await post(request, server.baseUrl, '/assets/asset-1/mint', { amount: 0 });
    expect(response.status()).toBe(400);
  });
});
