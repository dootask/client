import 'fake-indexeddb/auto';

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';

import { openIdbCache } from './indexeddb';
import { openSqliteCache, type SqlDriver } from './sqlite';
import type { CacheSchema, StructuredCache } from './types';

const schema: CacheSchema = {
  messages: { keyPath: 'id', indexes: { dialog_id: 'dialog_id' } },
  users: { keyPath: 'userid' },
};

interface Msg {
  id: number;
  dialog_id?: number;
  text: string;
}

const dir = mkdtempSync(join(tmpdir(), 'cache-test-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

/** 测试里用 node:sqlite 充当 expo-sqlite */
function nodeDriver(file: string): SqlDriver {
  const db = new DatabaseSync(file);
  return {
    exec: async (sql) => {
      db.exec(sql);
    },
    run: async (sql, params) => {
      db.prepare(sql).run(...params);
    },
    all: async <T,>(sql: string, params: readonly (string | number | null)[]) => db.prepare(sql).all(...params) as T[],
    transaction: async (task) => {
      db.exec('BEGIN');
      try {
        await task();
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
    close: async () => db.close(),
  };
}

/** 同一个 name 再次打开得到同一份数据，用来测持久化和版本升级 */
const backends: { name: string; open: (name: string, s: CacheSchema, version: number) => Promise<StructuredCache> }[] = [
  { name: 'indexeddb', open: (name, s, version) => openIdbCache(name, s, version) },
  { name: 'sqlite', open: (name, s, version) => openSqliteCache(nodeDriver(join(dir, `${name}.db`)), s, version) },
];

let seq = 0;

describe.each(backends)('StructuredCache: $name', ({ open }) => {
  let name: string;
  let cache: StructuredCache;

  beforeEach(async () => {
    name = `t${++seq}`;
    cache = await open(name, schema, 1);
  });
  afterEach(async () => {
    await cache.close();
  });

  const seed = () =>
    cache.putMany('messages', [
      { id: 3, dialog_id: 20, text: 'c' },
      { id: 1, dialog_id: 10, text: 'a' },
      { id: 2, dialog_id: 10, text: 'b' },
      { id: 4, text: '没有 dialog_id' },
    ]);

  it('按主键读写、覆盖、删除，记录原样取回', async () => {
    const record = { id: 1, dialog_id: 10, text: 'a', nested: { list: [1, '二'], flag: true, none: null } };
    await cache.put('messages', record);
    expect(await cache.get('messages', 1)).toEqual(record);
    await cache.put('messages', { id: 1, dialog_id: 11, text: 'x' });
    expect(await cache.get<Msg>('messages', 1)).toEqual({ id: 1, dialog_id: 11, text: 'x' });
    await cache.delete('messages', 1);
    expect(await cache.get('messages', 1)).toBeUndefined();
  });

  it('并发写入互不干扰（批量写不会嵌套事务）', async () => {
    await Promise.all([
      cache.putMany('messages', [{ id: 1, text: 'a' }, { id: 2, text: 'b' }]),
      cache.putMany('messages', [{ id: 3, text: 'c' }]),
      cache.put('messages', { id: 4, text: 'd' }),
      cache.delete('messages', 2),
    ]);
    expect((await cache.query<Msg>('messages')).map((m) => m.id)).toEqual([1, 3, 4]);
  });

  it('getMany 按传入顺序返回，跳过不存在的', async () => {
    await seed();
    const rows = await cache.getMany<Msg>('messages', [3, 99, 1]);
    expect(rows.map((r) => r.id)).toEqual([3, 1]);
    expect(await cache.getMany('messages', [])).toEqual([]);
  });

  it('数字 1 和字符串 "1" 是不同的主键，数字排在字符串前面', async () => {
    await cache.putMany('users', [{ userid: 'b' }, { userid: '1' }, { userid: 2 }, { userid: 1 }]);
    expect(await cache.count('users')).toBe(4);
    expect((await cache.query<{ userid: string | number }>('users')).map((r) => r.userid)).toEqual([1, 2, '1', 'b']);
  });

  it('按索引精确查询，同值按主键排；缺索引字段的记录不进索引', async () => {
    await seed();
    expect((await cache.query<Msg>('messages', { index: 'dialog_id', equals: 10 })).map((r) => r.id)).toEqual([1, 2]);
    expect((await cache.query<Msg>('messages', { index: 'dialog_id' })).map((r) => r.id)).toEqual([1, 2, 3]);
    expect((await cache.query<Msg>('messages', { index: 'dialog_id', direction: 'prev' })).map((r) => r.id)).toEqual([3, 2, 1]);
  });

  it('主键范围 + 方向 + limit（翻页）', async () => {
    await cache.putMany('messages', [1, 2, 3, 4, 5].map((id) => ({ id, dialog_id: 10, text: `m${id}` })));
    expect((await cache.query<Msg>('messages', { upper: 4, direction: 'prev', limit: 2 })).map((r) => r.id)).toEqual([4, 3]);
    expect((await cache.query<Msg>('messages', { lower: 2, limit: 2 })).map((r) => r.id)).toEqual([2, 3]);
    expect((await cache.query<Msg>('messages', { lower: 2, upper: 3 })).map((r) => r.id)).toEqual([2, 3]);
    expect(await cache.query('messages', { limit: 0 })).toEqual([]);
  });

  it('count：全部、按条件、受 limit 限制', async () => {
    await seed();
    expect(await cache.count('messages')).toBe(4);
    expect(await cache.count('messages', { index: 'dialog_id' })).toBe(3);
    expect(await cache.count('messages', { index: 'dialog_id', equals: 10 })).toBe(2);
    expect(await cache.count('messages', { lower: 2, limit: 1 })).toBe(1);
  });

  it('clear 只清空一个集合', async () => {
    await seed();
    await cache.put('users', { userid: 1 });
    await cache.clear('messages');
    expect(await cache.count('messages')).toBe(0);
    expect(await cache.count('users')).toBe(1);
  });

  it('putMany 有一条缺主键时整批不写', async () => {
    await expect(cache.putMany('messages', [{ id: 1, text: 'a' }, { text: '无主键' }])).rejects.toThrow('缺少主键');
    expect(await cache.count('messages')).toBe(0);
  });

  it('putMany 同一批里主键重复时后面的为准', async () => {
    await cache.putMany('messages', [
      { id: 1, dialog_id: 1, text: 'old' },
      { id: 1, dialog_id: 2, text: 'new' },
    ]);
    expect(await cache.get('messages', 1)).toEqual({ id: 1, dialog_id: 2, text: 'new' });
    expect(await cache.count('messages', { index: 'dialog_id', equals: 1 })).toBe(0);
  });

  it('putMany 大批量（超过单条语句的参数上限）全部写入', async () => {
    await cache.putMany('messages', Array.from({ length: 2500 }, (_, i) => ({ id: i + 1, dialog_id: i % 7, text: `m${i}` })));
    expect(await cache.count('messages')).toBe(2500);
    expect(await cache.count('messages', { index: 'dialog_id', equals: 3 })).toBe(357);
    expect(await cache.get('messages', 2500)).toEqual({ id: 2500, dialog_id: 2499 % 7, text: 'm2499' });
  });

  it('未知集合、未知索引报错', async () => {
    await expect(cache.put('nope', { id: 1 })).rejects.toThrow('未知集合');
    await expect(cache.get('nope', 1)).rejects.toThrow('未知集合');
    await expect(cache.query('messages', { index: 'ghost', equals: 1 })).rejects.toThrow('未知索引');
    await expect(cache.count('messages', { index: 'ghost' })).rejects.toThrow('未知索引');
  });

  it('关闭后重新打开，数据还在', async () => {
    await seed();
    await cache.close();
    cache = await open(name, schema, 1);
    expect(await cache.count('messages')).toBe(4);
  });

  it('版本变了按新结构清空重建', async () => {
    await seed();
    await cache.close();
    const next: CacheSchema = { messages: { keyPath: 'id', indexes: { text: 'text' } }, files: { keyPath: 'id' } };
    cache = await open(name, next, 2);
    expect(await cache.count('messages')).toBe(0);
    await cache.putMany('messages', [{ id: 1, text: 'b' }, { id: 2, text: 'a' }]);
    expect((await cache.query<Msg>('messages', { index: 'text' })).map((r) => r.id)).toEqual([2, 1]);
    await cache.put('files', { id: 1 });
    await expect(cache.put('users', { userid: 1 })).rejects.toThrow('未知集合');
  });
});
