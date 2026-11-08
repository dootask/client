import { type CacheQuery, type CacheSchema, collectionOf, primaryKeyOf, queryField, type StructuredCache } from './types';

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function rangeOf(query: CacheQuery | undefined): IDBKeyRange | undefined {
  if (!query) return undefined;
  const { equals, lower, upper } = query;
  if (equals !== undefined) return IDBKeyRange.only(equals);
  if (lower !== undefined && upper !== undefined) return IDBKeyRange.bound(lower, upper);
  if (lower !== undefined) return IDBKeyRange.lowerBound(lower);
  if (upper !== undefined) return IDBKeyRange.upperBound(upper);
  return undefined;
}

/** Web 端的结构化缓存。version 变了就删掉所有旧表按 schema 重建（缓存数据从服务端重新同步） */
export async function openIdbCache(name: string, schema: CacheSchema, version: number): Promise<StructuredCache> {
  const open = indexedDB.open(name, version);
  open.onupgradeneeded = () => {
    const db = open.result;
    for (const store of [...db.objectStoreNames]) db.deleteObjectStore(store);
    for (const [collection, def] of Object.entries(schema)) {
      const store = db.createObjectStore(collection, { keyPath: def.keyPath });
      for (const [index, field] of Object.entries(def.indexes ?? {})) store.createIndex(index, field);
    }
  };
  const db = await request(open);

  function store(collection: string, mode: IDBTransactionMode): IDBObjectStore {
    collectionOf(schema, collection);
    return db.transaction(collection, mode).objectStore(collection);
  }

  function source(collection: string, query: CacheQuery | undefined): IDBObjectStore | IDBIndex {
    queryField(collectionOf(schema, collection), query);
    const target = store(collection, 'readonly');
    return query?.index ? target.index(query.index) : target;
  }

  return {
    async put(collection, record) {
      primaryKeyOf(collectionOf(schema, collection), collection, record);
      await request(store(collection, 'readwrite').put(record));
    },
    async putMany(collection, records) {
      const def = collectionOf(schema, collection);
      for (const record of records) primaryKeyOf(def, collection, record);
      const target = store(collection, 'readwrite');
      for (const record of records) target.put(record);
      await done(target.transaction);
    },
    async get(collection, key) {
      return request(store(collection, 'readonly').get(key));
    },
    async getMany(collection, keys) {
      const target = store(collection, 'readonly');
      const rows = await Promise.all(keys.map((key) => request(target.get(key))));
      return rows.filter((row) => row !== undefined);
    },
    async delete(collection, key) {
      await request(store(collection, 'readwrite').delete(key));
    },
    async query(collection, query) {
      const cursor = source(collection, query).openCursor(rangeOf(query), query?.direction === 'prev' ? 'prev' : 'next');
      const limit = query?.limit ?? Infinity;
      const rows: never[] = [];
      if (limit <= 0) return rows;
      return new Promise((resolve, reject) => {
        cursor.onsuccess = () => {
          const current = cursor.result;
          if (!current) return resolve(rows);
          rows.push(current.value as never);
          if (rows.length >= limit) return resolve(rows);
          current.continue();
        };
        cursor.onerror = () => reject(cursor.error);
      });
    },
    async count(collection, query) {
      const total = await request(source(collection, query).count(rangeOf(query)));
      return query?.limit === undefined ? total : Math.min(total, query.limit);
    },
    async clear(collection) {
      await request(store(collection, 'readwrite').clear());
    },
    async close() {
      db.close();
    },
  };
}
