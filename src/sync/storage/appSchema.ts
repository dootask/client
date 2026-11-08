import type { CacheSchema } from './types';

/**
 * 应用的结构化缓存集合。M0 先占位，字段和索引在 M1 按会话、消息的同步方案定稿；
 * 改了结构就把 APP_CACHE_VERSION 加一，旧缓存会清空重建
 */
export const appCacheSchema = {
  dialogs: { keyPath: 'id', indexes: { last_at: 'last_at' } },
  messages: { keyPath: 'id', indexes: { dialog_id: 'dialog_id' } },
  users: { keyPath: 'userid' },
} satisfies CacheSchema;

export const APP_CACHE_NAME = 'dootask-cache';
export const APP_CACHE_VERSION = 1;
