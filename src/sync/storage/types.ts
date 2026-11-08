/** 主键和索引值只允许字符串和数字，两套后端排序一致：数字在前、字符串在后 */
export type CacheKey = string | number;

export interface CollectionSchema {
  /** 主键字段名 */
  keyPath: string;
  /** 索引名 → 记录里的字段名；字段缺失或不是字符串 / 数字的记录不进索引 */
  indexes?: Record<string, string>;
}

/** 集合名 → 结构定义。IndexedDB 建 objectStore、SQLite 建表都按它来 */
export type CacheSchema = Record<string, CollectionSchema>;

export interface CacheQuery {
  /** 按哪个索引查，省略按主键 */
  index?: string;
  /** 精确匹配，和 lower / upper 不同时用 */
  equals?: CacheKey;
  /** 下界（含） */
  lower?: CacheKey;
  /** 上界（含） */
  upper?: CacheKey;
  /** 默认升序；索引值相同的按主键排，降序时一起反过来 */
  direction?: 'next' | 'prev';
  limit?: number;
}

/**
 * 结构化缓存（会话、消息、用户等）。原生用 SQLite，Web 用 IndexedDB。
 * 查询只有「按主键取」和「按单个索引范围取」两种，两套后端都能走索引；不开放任意查询。
 * 它只是缓存：结构版本变了直接清空重建，数据从服务端重新同步。
 */
export interface StructuredCache {
  put(collection: string, record: object): Promise<void>;
  putMany(collection: string, records: readonly object[]): Promise<void>;
  get<T>(collection: string, key: CacheKey): Promise<T | undefined>;
  /** 按传入顺序返回，不存在的跳过 */
  getMany<T>(collection: string, keys: readonly CacheKey[]): Promise<T[]>;
  delete(collection: string, key: CacheKey): Promise<void>;
  query<T>(collection: string, query?: CacheQuery): Promise<T[]>;
  count(collection: string, query?: CacheQuery): Promise<number>;
  clear(collection: string): Promise<void>;
  close(): Promise<void>;
}

export function collectionOf(schema: CacheSchema, collection: string): CollectionSchema {
  const def = schema[collection];
  if (!def) throw new Error(`未知集合：${collection}`);
  return def;
}

/** 查询用的字段：索引对应的字段，没指定索引就是主键 */
export function queryField(def: CollectionSchema, query: CacheQuery | undefined): string {
  if (!query?.index) return def.keyPath;
  const field = def.indexes?.[query.index];
  if (!field) throw new Error(`未知索引：${query.index}`);
  return field;
}

export function isCacheKey(value: unknown): value is CacheKey {
  return typeof value === 'string' || (typeof value === 'number' && !Number.isNaN(value));
}

export function primaryKeyOf(def: CollectionSchema, collection: string, record: object): CacheKey {
  const key = (record as Record<string, unknown>)[def.keyPath];
  if (!isCacheKey(key)) throw new Error(`集合 ${collection} 的记录缺少主键 ${def.keyPath}`);
  return key;
}
