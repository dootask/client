import { openDatabaseAsync } from 'expo-sqlite';

import { APP_CACHE_NAME, APP_CACHE_VERSION, appCacheSchema } from './appSchema';
import { openSqliteCache } from './sqlite';
import type { CacheSchema, StructuredCache } from './types';

/** 原生端：expo-sqlite */
export async function openAppCache(): Promise<StructuredCache> {
  return openCache(APP_CACHE_NAME, appCacheSchema, APP_CACHE_VERSION);
}

export async function openCache(name: string, schema: CacheSchema, version: number): Promise<StructuredCache> {
  const db = await openDatabaseAsync(`${name}.db`);
  await db.execAsync('PRAGMA journal_mode = WAL');
  return openSqliteCache(
    {
      exec: (sql) => db.execAsync(sql),
      run: async (sql, params) => {
        await db.runAsync(sql, [...params]);
      },
      all: (sql, params) => db.getAllAsync(sql, [...params]),
      transaction: (task) => db.withTransactionAsync(task),
      close: () => db.closeAsync(),
    },
    schema,
    version,
  );
}
