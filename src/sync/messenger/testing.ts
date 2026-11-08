import type { CacheQuery, StructuredCache } from '../storage/types';
import type { MessengerKv } from './engine';

/* 测试用的内存实现（单元测试和联调测试共用） */

/** 内存版结构化缓存：只实现引擎用到的主键和单索引精确查询 */
export function memoryCache(): StructuredCache & { data: Record<string, Map<number, Record<string, unknown>>> } {
  const data: Record<string, Map<number, Record<string, unknown>>> = { dialogs: new Map(), messages: new Map() };
  const col = (name: string) => (data[name] ??= new Map());
  return {
    data,
    async put(c, r) {
      col(c).set((r as { id: number }).id, structuredClone(r) as Record<string, unknown>);
    },
    async putMany(c, rs) {
      for (const r of rs) col(c).set((r as { id: number }).id, structuredClone(r) as Record<string, unknown>);
    },
    async get<T>(c: string, k: number | string) {
      return col(c).get(Number(k)) as T | undefined;
    },
    async getMany<T>(c: string, ks: readonly (number | string)[]) {
      return ks.map((k) => col(c).get(Number(k))).filter(Boolean) as T[];
    },
    async delete(c, k) {
      col(c).delete(Number(k));
    },
    async query<T>(c: string, q?: CacheQuery) {
      const all = [...col(c).values()];
      const field = q?.index === 'dialog_id' ? 'dialog_id' : 'id';
      return (q?.equals === undefined ? all : all.filter((r) => r[field] === q.equals)) as T[];
    },
    async count(c) {
      return col(c).size;
    },
    async clear(c) {
      col(c).clear();
    },
    async close() {},
  };
}

export function memoryKv(): MessengerKv & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    get: (name) => map.get(name),
    set: (name, value) => void map.set(name, value),
    remove: (name) => void map.delete(name),
  };
}

