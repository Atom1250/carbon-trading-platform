import { APIRequestContext, APIResponse } from '@playwright/test';

export async function post(
  request: APIRequestContext,
  baseUrl: string,
  path: string,
  data: unknown,
): Promise<APIResponse> {
  return request.post(`${baseUrl}${path}`, { data });
}

export async function get(
  request: APIRequestContext,
  baseUrl: string,
  path: string,
): Promise<APIResponse> {
  return request.get(`${baseUrl}${path}`);
}
