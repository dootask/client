import type { CacheSchema } from './types';

/**
 * 应用的结构化缓存集合（会话、消息的缓存方案见 docs/m1-features.md）。只存当前登录账号的数据，换号时清空。
 * 改了结构就把 APP_CACHE_VERSION 加一，旧缓存会清空重建
 */
export const appCacheSchema = {
  dialogs: { keyPath: 'id', indexes: { last_at: 'last_at' } },
  messages: { keyPath: 'id', indexes: { dialog_id: 'dialog_id' } },
  users: { keyPath: 'userid' },
} satisfies CacheSchema;

export const APP_CACHE_NAME = 'dootask-cache';
export const APP_CACHE_VERSION = 1;
