import { vi } from 'vitest';

import { type ApiClientOptions, createApiClient } from './client';

/** 测试用：假 fetch 按顺序返回 responses（Error 则抛出，NOT_JSON 则解析失败），并记录每次调用 */
export const NOT_JSON = Symbol('not-json');

export function setup(responses: unknown[], extra: Partial<ApiClientOptions> = {}) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const next = responses.shift();
    if (next instanceof Error) throw next;
    return { json: async () => (next === NOT_JSON ? JSON.parse('<html>') : next) } as Response;
  });
  const client = createApiClient({
    getServer: () => 'https://demo.example.com/',
    getToken: () => 'tok',
    getFd: () => '12',
    language: () => 'zh',
    version: '1.0.0',
    platform: 'web',
    fetch: fetchMock as unknown as typeof fetch,
    ...extra,
  });
  return { client, calls };
}
