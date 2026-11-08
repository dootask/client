import { z } from 'zod';

import type { ApiClient, RequestOptions } from './client';
import { ApiError } from './errors';

/**
 * PHP 的 array_filter 会保留下标，下标不连续时 json_encode 输出对象而不是数组，
 * 例如 {"1": 5}。这里统一转成数组再校验。
 */
export function phpList<T extends z.ZodType>(item: T) {
  return z.preprocess((value) => {
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object') return Object.values(value);
    return [];
  }, z.array(item));
}

/** 请求并用 zod 校验 data；校验失败按 invalid 处理，issues 放在 data 里便于排查 */
export async function requestParsed<S extends z.ZodType>(client: ApiClient, path: string, schema: S, opts?: RequestOptions): Promise<{ data: z.output<S>; msg: string }> {
  const { data, msg } = await client.request(path, opts);
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new ApiError('invalid', 0, `Unexpected response from ${path}`, { path, issues: parsed.error.issues });
  }
  return { data: parsed.data, msg };
}
