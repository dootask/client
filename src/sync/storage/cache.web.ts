import { APP_CACHE_NAME, APP_CACHE_VERSION, appCacheSchema } from './appSchema';
import { openIdbCache } from './indexeddb';
import type { StructuredCache } from './types';

/** Web 端：IndexedDB（不用 expo-sqlite 的原因见 architecture.md 选型表） */
export function openAppCache(): Promise<StructuredCache> {
  return openIdbCache(APP_CACHE_NAME, appCacheSchema, APP_CACHE_VERSION);
}
