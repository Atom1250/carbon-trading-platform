import { expect, test } from '@playwright/test';

import { post } from './helpers/http-client';
import { createMockPlatformServer, MockPlatformServer } from './helpers/mock-platform-server';

test.describe('User registration login and MFA flow', () => {
  let server: MockPlatformServer;

  test.beforeAll(async () => {
    server = await createMockPlatformServer();
  });

  test.afterAll(async () => {
    await server.stop();
  });

  test('registers a new user', async ({ request }) => {
    const response = await post(request, server.baseUrl, '/auth/register', {
      email: 'trader@example.com',
      password: 'secret123',
    });

    expect(response.status()).toBe(201);
    await expect(response.json()).resolves.toMatchObject({ mfaEnabled: true });
  });

  test('rejects duplicate registration', async ({ request }) => {
    const response = await post(request, server.baseUrl, '/auth/register', {
      email: 'trader@example.com',
      password: 'secret123',
    });

    expect(response.status()).toBe(409);
  });

  test('requires email and password to register', async ({ request }) => {
    const response = await post(request, server.baseUrl, '/auth/register', {
      email: 'invalid@example.com',
    });

    expect(response.status()).toBe(400);
  });

  test('creates MFA challenge on valid login', async ({ request }) => {
    const response = await post(request, server.baseUrl, '/auth/login', {
      email: 'trader@example.com',
      password: 'secret123',
    });

    expect(response.status()).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ mfaRequired: true });
  });

  test('rejects invalid login credentials', async ({ request }) => {
    const response = await post(request, server.baseUrl, '/auth/login', {
      email: 'trader@example.com',
      password: 'wrong',
    });

    expect(response.status()).toBe(401);
  });

  test('verifies valid MFA code and returns token', async ({ request }) => {
    const response = await post(request, server.baseUrl, '/auth/mfa/verify', {
      email: 'trader@example.com',
      code: '123456',
    });

    expect(response.status()).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ token: 'token-user-1' });
  });

  test('rejects invalid MFA code', async ({ request }) => {
    const response = await post(request, server.baseUrl, '/auth/mfa/verify', {
      email: 'trader@example.com',
      code: '999999',
    });

    expect(response.status()).toBe(401);
  });
});
