import { expect, test } from '@playwright/test';

import { get, post } from './helpers/http-client';
import { createMockPlatformServer, MockPlatformServer } from './helpers/mock-platform-server';

test.describe('Institution onboarding flow', () => {
  let server: MockPlatformServer;

  test.beforeAll(async () => {
    server = await createMockPlatformServer();
  });

  test.afterAll(async () => {
    await server.stop();
  });

  test('creates an institution onboarding request', async ({ request }) => {
    const response = await post(request, server.baseUrl, '/institutions/onboard', {
      name: 'Atlas Bank',
      country: 'US',
    });

    expect(response.status()).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      id: 'inst-1',
      status: 'pending_review',
    });
  });

  test('rejects onboarding without institution name', async ({ request }) => {
    const response = await post(request, server.baseUrl, '/institutions/onboard', {
      country: 'US',
    });

    expect(response.status()).toBe(400);
  });

  test('stores institution metadata', async ({ request }) => {
    await post(request, server.baseUrl, '/institutions/onboard', {
      name: 'Carbon Prime',
      country: 'GB',
    });

    const institution = await get(request, server.baseUrl, '/institutions/inst-2');
    expect(institution.status()).toBe(200);
    await expect(institution.json()).resolves.toMatchObject({
      name: 'Carbon Prime',
      country: 'GB',
    });
  });

  test('returns not found for unknown institution id', async ({ request }) => {
    const response = await get(request, server.baseUrl, '/institutions/inst-999');
    expect(response.status()).toBe(404);
  });

  test('allows multiple institution onboarding requests', async ({ request }) => {
    const one = await post(request, server.baseUrl, '/institutions/onboard', {
      name: 'Eco Finance',
      country: 'FR',
    });
    const two = await post(request, server.baseUrl, '/institutions/onboard', {
      name: 'Helios Capital',
      country: 'DE',
    });

    expect(one.status()).toBe(201);
    expect(two.status()).toBe(201);
    await expect(two.json()).resolves.toMatchObject({ id: 'inst-4' });
  });

  test('requires country for onboarding', async ({ request }) => {
    const response = await post(request, server.baseUrl, '/institutions/onboard', {
      name: 'Missing Country Bank',
    });

    expect(response.status()).toBe(400);
  });
});
