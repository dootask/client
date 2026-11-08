import { type CacheKey, type CacheQuery, type CacheSchema, collectionOf, type CollectionSchema, isCacheKey, primaryKeyOf, queryField, type StructuredCache } from './types';

export type SqlValue = string | number | null;

/** SQLite 的最小接口：原生端接 expo-sqlite，测试里接 node:sqlite，缓存逻辑只写一份 */
export interface SqlDriver {
  exec(sql: string): Promise<void>;
  run(sql: string, params: readonly SqlValue[]): Promise<void>;
  all<T>(sql: string, params: readonly SqlValue[]): Promise<T[]>;
  /** task 里的语句全部成功才提交，有一条失败就回滚 */
  transaction(task: () => Promise<void>): Promise<void>;
  close(): Promise<void>;
}

const KEY = 'k';
const DATA = 'v';
const indexColumn = (index: string) => `i_${index}`;
/** 每条语句最多绑定的参数个数 */
const MAX_PARAMS = 999;
const quote = (name: string) => `"${name.replace(/"/g, '""')}"`;

/**
 * 每个集合一张表：主键列、JSON 正文列、每个索引一列。
 * 列不声明类型，数字和字符串原样存取，排序规则和 IndexedDB 一致（数字在前）。
 * version 记在 user_version 里，变了就删表按 schema 重建。
 */
export async function openSqliteCache(driver: SqlDriver, schema: CacheSchema, version: number): Promise<StructuredCache> {
  const [{ user_version: current }] = await driver.all<{ user_version: number }>('PRAGMA user_version', []);
  if (current !== version) {
    const tables = await driver.all<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'", []);
    await driver.transaction(async () => {
      for (const { name } of tables) await driver.exec(`DROP TABLE ${quote(name)}`);
      for (const [collection, def] of Object.entries(schema)) {
        const indexes = Object.keys(def.indexes ?? {});
        const columns = [`${KEY} PRIMARY KEY NOT NULL`, `${DATA} TEXT NOT NULL`, ...indexes.map((index) => quote(indexColumn(index)))];
        await driver.exec(`CREATE TABLE ${quote(collection)} (${columns.join(', ')})`);
        for (const index of indexes) {
          await driver.exec(`CREATE INDEX ${quote(`${collection}_${index}`)} ON ${quote(collection)} (${quote(indexColumn(index))}, ${KEY})`);
        }
      }
      await driver.exec(`PRAGMA user_version = ${Math.trunc(version)}`);
    });
  }

  /**
   * 批量写入：一条 INSERT 带多行 VALUES，原生端每条语句是一次跨线程调用，逐行写 1000 条要好几秒。
   * 每条语句的参数不超过 SQLite 旧版的默认上限 999
   */
  async function upsert(collection: string, def: CollectionSchema, records: readonly object[]): Promise<void> {
    const indexes = Object.entries(def.indexes ?? {});
    const columns = [KEY, DATA, ...indexes.map(([index]) => quote(indexColumn(index)))];
    const row = `(${columns.map(() => '?').join(', ')})`;
    const perStatement = Math.floor(MAX_PARAMS / columns.length);
    for (let start = 0; start < records.length; start += perStatement) {
      const chunk = records.slice(start, start + perStatement);
      const params = chunk.flatMap((record) => [
        primaryKeyOf(def, collection, record),
        JSON.stringify(record),
        ...indexes.map(([, field]) => {
          const value = (record as Record<string, unknown>)[field];
          return isCacheKey(value) ? value : null;
        }),
      ]);
      await driver.run(`INSERT OR REPLACE INTO ${quote(collection)} (${columns.join(', ')}) VALUES ${chunk.map(() => row).join(', ')}`, params);
    }
  }

  /** WHERE 子句和参数；按索引查时跳过没有索引值的记录，与 IndexedDB 一致 */
  function where(collection: string, query: CacheQuery | undefined): { column: string; clause: string; params: SqlValue[] } {
    queryField(collectionOf(schema, collection), query);
    const column = query?.index ? quote(indexColumn(query.index)) : KEY;
    const conditions: string[] = query?.index ? [`${column} IS NOT NULL`] : [];
    const params: SqlValue[] = [];
    const add = (op: string, value: CacheKey | undefined) => {
      if (value === undefined) return;
      conditions.push(`${column} ${op} ?`);
      params.push(value);
    };
    add('=', query?.equals);
    if (query?.equals === undefined) {
      add('>=', query?.lower);
      add('<=', query?.upper);
    }
    return { column, clause: conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '', params };
  }

  const parse = <T>(rows: { v: string }[]) => rows.map((row) => JSON.parse(row.v) as T);

  /**
   * 写操作排队执行：同一个连接上事务不能嵌套，并发的 putMany 会撞上「事务里再开事务」，
   * 单条写入插进别人的事务也会跟着回滚
   */
  let writes: Promise<unknown> = Promise.resolve();
  function write(task: () => Promise<void>): Promise<void> {
    const next = writes.then(task);
    writes = next.catch(() => {});
    return next;
  }

  return {
    async put(collection, record) {
      const def = collectionOf(schema, collection);
      await write(() => upsert(collection, def, [record]));
    },
    async putMany(collection, records) {
      const def = collectionOf(schema, collection);
      for (const record of records) primaryKeyOf(def, collection, record);
      if (records.length === 0) return;
      await write(() => driver.transaction(() => upsert(collection, def, records)));
    },
    async get<T>(collection: string, key: CacheKey) {
      collectionOf(schema, collection);
      const [row] = await driver.all<{ v: string }>(`SELECT ${DATA} FROM ${quote(collection)} WHERE ${KEY} = ?`, [key]);
      return row ? (JSON.parse(row.v) as T) : undefined;
    },
    async getMany<T>(collection: string, keys: readonly CacheKey[]) {
      collectionOf(schema, collection);
      if (!keys.length) return [];
      const rows = await driver.all<{ k: CacheKey; v: string }>(`SELECT ${KEY}, ${DATA} FROM ${quote(collection)} WHERE ${KEY} IN (${keys.map(() => '?').join(', ')})`, keys);
      const byKey = new Map(rows.map((row) => [row.k, row.v]));
      return keys.flatMap((key) => (byKey.has(key) ? [JSON.parse(byKey.get(key)!) as T] : []));
    },
    async delete(collection, key) {
      collectionOf(schema, collection);
      await write(() => driver.run(`DELETE FROM ${quote(collection)} WHERE ${KEY} = ?`, [key]));
    },
    async query<T>(collection: string, query?: CacheQuery) {
      const { column, clause, params } = where(collection, query);
      const order = query?.direction === 'prev' ? 'DESC' : 'ASC';
      const orderBy = column === KEY ? `${KEY} ${order}` : `${column} ${order}, ${KEY} ${order}`;
      const limit = query?.limit === undefined ? '' : ' LIMIT ?';
      const rows = await driver.all<{ v: string }>(`SELECT ${DATA} FROM ${quote(collection)}${clause} ORDER BY ${orderBy}${limit}`, query?.limit === undefined ? params : [...params, query.limit]);
      return parse<T>(rows);
    },
    async count(collection, query) {
      const { clause, params } = where(collection, query);
      const [{ n }] = await driver.all<{ n: number }>(`SELECT COUNT(*) AS n FROM ${quote(collection)}${clause}`, params);
      return query?.limit === undefined ? n : Math.min(n, query.limit);
    },
    async clear(collection) {
      collectionOf(schema, collection);
      await write(() => driver.run(`DELETE FROM ${quote(collection)}`, []));
    },
    async close() {
      await driver.close();
    },
  };
}
