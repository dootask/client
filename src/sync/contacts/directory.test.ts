import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Departments } from '../api/contacts';
import type { UserBasic } from '../api/users';
import { openIdbCache } from '../storage/indexeddb';
import type { StructuredCache } from '../storage/types';
import { createContactsDirectory, type ContactsDirectory, type ContactsSnapshot } from './directory';

type Deps = Parameters<typeof createContactsDirectory>[0];
type Page = Awaited<ReturnType<Deps['page']>>;
const user = (userid: number, nickname = `成员${userid}`): UserBasic => ({ userid, nickname });
const departments: Departments = { departments: [{ id: 10, name: '新部门', level: 0, total_count: 4 }], no_department_count: 0, total: 4 };
const snapshot = (owner = '账号甲'): ContactsSnapshot => ({ owner, users: [user(8, '缓存成员')], departments: { departments: [{ id: 90, name: '缓存部门' }] } });
const pageData = (current: number, users: UserBasic[], last = 1, total = users.length): Page => ({ data: users, current_page: current, last_page: last, total });

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

let sequence = 0;

describe('通讯录目录缓存引擎', () => {
  let cache: StructuredCache;
  let directories: ContactsDirectory[];

  beforeEach(async () => {
    cache = await openIdbCache(`contacts-tests-${++sequence}`, { snapshots: { keyPath: 'owner' } }, 1);
    directories = [];
  });

  afterEach(async () => {
    for (const dir of directories) dir.stop();
    await cache.close();
  });

  function setup(owner = '账号甲', overrides: Partial<Omit<Deps, 'owner'>> = {}) {
    const dir = createContactsDirectory({ owner, cache: async () => cache, departments: async () => departments, page: async (page) => pageData(page, [user(1)]), ...overrides });
    directories.push(dir);
    return dir;
  }

  it('先发布缓存，网络完成后替换快照并写回缓存', async () => {
    const old = snapshot();
    await cache.put('snapshots', old);
    const departmentRequest = deferred<Departments>();
    const userRequest = deferred<Page>();
    const started = deferred<void>();
    const dir = setup('账号甲', {
      departments: () => departmentRequest.promise,
      page: () => { started.resolve(); return userRequest.promise; },
    });
    const pending = dir.refresh();
    expect(dir.store.getState()).toEqual({ snapshot: null, loading: true });
    await started.promise;
    expect(dir.store.getState()).toEqual({ snapshot: old, loading: true });
    expect(await cache.get('snapshots', '账号甲')).toEqual(old);
    departmentRequest.resolve(departments);
    userRequest.resolve(pageData(1, [user(1, '新成员')]));
    await pending;
    const fresh = { owner: '账号甲', departments, users: [user(1, '新成员')] };
    expect(dir.store.getState()).toEqual({ snapshot: fresh, loading: false });
    expect(await cache.get('snapshots', '账号甲')).toEqual(fresh);
  });

  it('合并所有分页按编号去重，后页记录覆盖旧记录且完整写入缓存', async () => {
    const pages = [pageData(1, [user(3, '旧名'), user(1)], 3, 4), pageData(2, [user(2), user(3, '新名')], 3, 4), pageData(3, [user(4)], 3, 4)];
    const page = vi.fn(async (number: number) => pages[number - 1]!);
    const dir = setup('账号甲', { page });
    await dir.refresh();
    expect(page.mock.calls).toEqual([[1, undefined], [2, undefined], [3, undefined]]);
    const fresh = { owner: '账号甲', departments, users: [user(3, '新名'), user(1), user(2), user(4)] };
    expect(dir.store.getState()).toEqual({ snapshot: fresh, loading: false });
    expect(await cache.get('snapshots', '账号甲')).toEqual(fresh);
  });

  it('空分页也生成完整空快照', async () => {
    const empty: Departments = { departments: [], no_department_count: 0, total: 0 };
    const page = vi.fn(async () => pageData(1, []));
    const dir = setup('账号甲', { departments: async () => empty, page });
    await dir.refresh();
    expect(page).toHaveBeenCalledTimes(1);
    expect(dir.store.getState()).toEqual({ snapshot: { owner: '账号甲', departments: empty, users: [] }, loading: false });
    expect(await cache.get('snapshots', '账号甲')).toEqual(dir.store.getState().snapshot);
  });

  it('搜索向所有分页传递关键词并去重，不覆盖目录或缓存', async () => {
    const page = vi.fn(async (number: number, key?: string) => key === undefined ? pageData(1, [user(1)]) : number === 1 ? pageData(1, [user(2, '旧名'), user(3)], 2, 3) : pageData(2, [user(2, '新名'), user(4)], 2, 3));
    const fetchDepartments = vi.fn(async () => departments);
    const dir = setup('账号甲', { page, departments: fetchDepartments });
    await dir.refresh();
    const before = dir.store.getState();
    const cached = await cache.get('snapshots', '账号甲');
    page.mockClear();
    expect(await dir.search('hx')).toEqual([user(2, '新名'), user(3), user(4)]);
    expect(page.mock.calls).toEqual([[1, 'hx'], [2, 'hx']]);
    expect(fetchDepartments).toHaveBeenCalledTimes(1);
    expect(dir.store.getState()).toBe(before);
    expect(await cache.get('snapshots', '账号甲')).toEqual(cached);
  });

  it('共享缓存的不同账号独立读取和写入快照', async () => {
    const oldA = snapshot('账号甲');
    const oldB = { ...snapshot('账号乙'), users: [user(9, '乙缓存')] };
    await cache.putMany('snapshots', [oldA, oldB]);
    const requestA = deferred<Page>();
    const requestB = deferred<Page>();
    const startedA = deferred<void>();
    const startedB = deferred<void>();
    const dirA = setup('账号甲', { page: () => { startedA.resolve(); return requestA.promise; } });
    const dirB = setup('账号乙', { page: () => { startedB.resolve(); return requestB.promise; } });
    const pendingA = dirA.refresh();
    const pendingB = dirB.refresh();
    await Promise.all([startedA.promise, startedB.promise]);
    expect(dirA.store.getState().snapshot).toEqual(oldA);
    expect(dirB.store.getState().snapshot).toEqual(oldB);
    requestA.resolve(pageData(1, [user(1, '甲新成员')]));
    requestB.resolve(pageData(1, [user(2, '乙新成员')]));
    await Promise.all([pendingA, pendingB]);
    const freshA = { owner: '账号甲', departments, users: [user(1, '甲新成员')] };
    const freshB = { owner: '账号乙', departments, users: [user(2, '乙新成员')] };
    expect(dirA.store.getState().snapshot).toEqual(freshA);
    expect(dirB.store.getState().snapshot).toEqual(freshB);
    expect(await cache.get('snapshots', '账号甲')).toEqual(freshA);
    expect(await cache.get('snapshots', '账号乙')).toEqual(freshB);
    expect(await cache.count('snapshots')).toBe(2);
  });

  it('本账号没有缓存时不使用其他账号缓存', async () => {
    const oldA = snapshot('账号甲');
    await cache.put('snapshots', oldA);
    const request = deferred<Page>();
    const started = deferred<void>();
    const dir = setup('账号乙', { page: () => { started.resolve(); return request.promise; } });
    const pending = dir.refresh();
    await started.promise;
    expect(dir.store.getState()).toEqual({ snapshot: null, loading: true });
    request.resolve(pageData(1, [user(2)]));
    await pending;
    expect(await cache.get('snapshots', '账号甲')).toEqual(oldA);
    expect(await cache.get('snapshots', '账号乙')).toEqual({ owner: '账号乙', departments, users: [user(2)] });
  });

  it('停止后忽略迟到的缓存，不再发网络请求', async () => {
    const old = snapshot();
    await cache.put('snapshots', old);
    const cacheRequest = deferred<StructuredCache>();
    const page = vi.fn(async () => pageData(1, [user(1)]));
    const fetchDepartments = vi.fn(async () => departments);
    const put = vi.spyOn(cache, 'put');
    const dir = setup('账号甲', { cache: () => cacheRequest.promise, page, departments: fetchDepartments });
    const pending = dir.refresh();
    dir.stop();
    cacheRequest.resolve(cache);
    await pending;
    expect(dir.store.getState().snapshot).toBeNull();
    expect(page).not.toHaveBeenCalled();
    expect(fetchDepartments).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
    expect(await cache.get('snapshots', '账号甲')).toEqual(old);
  });

  it('停止后忽略部门及分页结果，不继续翻页或写缓存', async () => {
    const old = snapshot();
    await cache.put('snapshots', old);
    const request = deferred<Page>();
    const departmentRequest = deferred<Departments>();
    const started = deferred<void>();
    const page = vi.fn(() => { started.resolve(); return request.promise; });
    const put = vi.spyOn(cache, 'put');
    const dir = setup('账号甲', { page, departments: () => departmentRequest.promise });
    const pending = dir.refresh();
    await started.promise;
    const before = dir.store.getState();
    expect(before.snapshot).toEqual(old);
    dir.stop();
    departmentRequest.resolve(departments);
    request.resolve(pageData(1, [user(1)], 3, 3));
    await pending;
    expect(dir.store.getState()).toBe(before);
    expect(page).toHaveBeenCalledTimes(1);
    expect(put).not.toHaveBeenCalled();
    expect(await cache.get('snapshots', '账号甲')).toEqual(old);
  });

  it('等待缓存连接时停止，不写入旧账号快照', async () => {
    const connection = deferred<StructuredCache>();
    const started = deferred<void>();
    let calls = 0;
    const dir = setup('账号甲', { cache: () => {
      if (++calls === 1) return Promise.resolve(cache);
      started.resolve();
      return connection.promise;
    } });
    const put = vi.spyOn(cache, 'put');
    const pending = dir.refresh();
    await started.promise;
    dir.stop();
    connection.resolve(cache);
    await pending;
    expect(put).not.toHaveBeenCalled();
    expect(await cache.count('snapshots')).toBe(0);
  });

  it('停止后忽略搜索结果并停止搜索翻页', async () => {
    const request = deferred<Page>();
    const page = vi.fn(() => request.promise);
    const dir = setup('账号甲', { page });
    const before = dir.store.getState();
    const pending = dir.search('hx');
    dir.stop();
    request.resolve(pageData(1, [user(1)], 3, 3));
    expect(await pending).toEqual([]);
    expect(page).toHaveBeenCalledExactlyOnceWith(1, 'hx');
    expect(dir.store.getState()).toBe(before);
    expect(await cache.count('snapshots')).toBe(0);
  });

  it.each(['部门', '第一页', '后续分页'])('请求失败保留完整缓存，不提交部分结果：%s', async (failure) => {
    const old = snapshot();
    await cache.put('snapshots', old);
    const error = new Error('请求失败');
    const put = vi.spyOn(cache, 'put');
    const dir = setup('账号甲', {
      departments: async () => { if (failure === '部门') throw error; return departments; },
      page: async (number) => {
        if ((failure === '第一页' && number === 1) || (failure === '后续分页' && number === 2)) throw error;
        return pageData(number, [user(number)], 2, 2);
      },
    });
    await expect(dir.refresh()).rejects.toBe(error);
    expect(dir.store.getState()).toEqual({ snapshot: old, loading: false });
    expect(put).not.toHaveBeenCalled();
    expect(await cache.get('snapshots', '账号甲')).toEqual(old);
  });

  it('无缓存请求失败保持空快照并结束加载', async () => {
    const error = new Error('请求失败');
    const dir = setup('账号甲', { page: async () => { throw error; } });
    await expect(dir.refresh()).rejects.toBe(error);
    expect(dir.store.getState()).toEqual({ snapshot: null, loading: false });
    expect(await cache.count('snapshots')).toBe(0);
  });

  it('并发刷新复用同一请求，完成后允许再次刷新', async () => {
    const request = deferred<Page>();
    const started = deferred<void>();
    const page = vi.fn(() => { started.resolve(); return request.promise; });
    const fetchDepartments = vi.fn(async () => departments);
    const dir = setup('账号甲', { page, departments: fetchDepartments });
    const first = dir.refresh();
    expect(dir.refresh()).toBe(first);
    await started.promise;
    expect(page).toHaveBeenCalledTimes(1);
    expect(fetchDepartments).toHaveBeenCalledTimes(1);
    request.resolve(pageData(1, [user(1)]));
    await first;
    await dir.refresh();
    expect(page).toHaveBeenCalledTimes(2);
    expect(fetchDepartments).toHaveBeenCalledTimes(2);
    expect(dir.store.getState().loading).toBe(false);
  });
});
