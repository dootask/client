import { beforeEach, describe, expect, it, vi } from 'vitest';

// 键值存储换成内存实现（MMKV 是原生模块）
const memory = new Map<string, string>();
vi.mock('../../sync/storage', () => ({
  KV_KEYS: { server: 'auth.server', token: 'auth.token', user: 'auth.user' },
  kv: {
    getString: (key: string) => memory.get(key),
    set: (key: string, value: string) => memory.set(key, value),
    remove: (key: string) => memory.delete(key),
  },
}));

const user = (token: string) => ({ userid: 1, email: 'a@example.com', nickname: 'A', token }) as never;

async function load() {
  vi.resetModules();
  return import('./store');
}

describe('session store', () => {
  beforeEach(() => memory.clear());

  it('冷启动从存储同步读出登录状态；存的用户信息坏了当没有', async () => {
    memory.set('auth.server', 'https://a.example.com');
    memory.set('auth.token', 'tok');
    memory.set('auth.user', '{bad json');
    const { useSession } = await load();
    expect(useSession.getState()).toMatchObject({ server: 'https://a.example.com', token: 'tok', user: null, notice: null });
  });

  it('saveUser：服务端没换发 token 时保留原来的；清掉被动退出的提示', async () => {
    const { useSession, saveServer, saveUser, clearLogin } = await load();
    saveServer('https://a.example.com', null);
    saveUser(user('t1'));
    clearLogin('身份已失效');
    expect(useSession.getState()).toMatchObject({ token: '', user: null, notice: '身份已失效' });
    expect(memory.has('auth.token')).toBe(false);
    saveUser(user('t2'));
    saveUser(user(''));
    expect(useSession.getState()).toMatchObject({ token: 't2', notice: null });
    expect(memory.get('auth.token')).toBe('t2');
  });

  it('saveServer：换了服务器登录作废，同一台只更新版本状态', async () => {
    const { useSession, saveServer, saveUser } = await load();
    saveServer('https://a.example.com', null);
    saveUser(user('t1'));
    saveServer('https://a.example.com', '1.0.0');
    expect(useSession.getState()).toMatchObject({ token: 't1', outdated: '1.0.0' });
    saveServer('https://b.example.com', null);
    expect(useSession.getState()).toMatchObject({ server: 'https://b.example.com', token: '', user: null, outdated: null });
    expect(memory.get('auth.server')).toBe('https://b.example.com');
    expect(memory.has('auth.user')).toBe(false);
  });
});
