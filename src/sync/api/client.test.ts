import { describe, expect, it, vi } from 'vitest';

import { createApiClient, toQuery } from './client';
import { ApiError, RET } from './errors';
import { NOT_JSON, setup } from './fakeFetch';

describe('toQuery', () => {
  it('按 jQuery.param 规则展开数组和对象', () => {
    expect(toQuery({ a: 1, b: [1, 2], c: { d: 'x y' }, e: undefined, f: null })).toBe('a=1&b%5B%5D=1&b%5B%5D=2&c%5Bd%5D=x%20y&f=');
    expect(toQuery({ list: [{ id: 1 }] })).toBe('list%5B0%5D%5Bid%5D=1');
  });
});

describe('请求头与请求体', () => {
  it('GET 拼接查询串并带上全部默认请求头', async () => {
    const { client, calls } = setup([{ ret: 1, msg: 'ok', data: { id: 1 } }]);
    const res = await client.request<{ id: number }>('users/info', { data: { at: new Date(2026, 9, 26, 8, 5, 9) } });
    expect(res).toEqual({ data: { id: 1 }, msg: 'ok' });
    expect(calls[0].url).toBe('https://demo.example.com/api/users/info?at=2026-10-26%2008%3A05%3A09');
    expect(calls[0].init.method).toBe('GET');
    expect(calls[0].init.headers).toEqual({
      'Content-Type': 'application/json',
      'dootask-token': 'tok',
      fd: '12',
      language: 'zh',
      version: '1.0.0',
      platform: 'web',
    });
  });

  it('请求头每次现取，不缓存', async () => {
    let token = 'a';
    const { client, calls } = setup([{ ret: 1 }, { ret: 1 }], { getToken: () => token });
    await client.request('x');
    token = 'b';
    await client.request('x');
    expect(calls.map((c) => (c.init.headers as Record<string, string>)['dootask-token'])).toEqual(['a', 'b']);
  });

  it('POST 以 JSON 发送', async () => {
    const { client, calls } = setup([{ ret: 1, msg: '', data: {} }]);
    await client.request('dialog/msg/sendtext', { method: 'post', data: { dialog_id: 1, text: 'hi' } });
    expect(calls[0].init.body).toBe('{"dialog_id":1,"text":"hi"}');
  });

  it('加密：有数据时替换请求体并强制 POST，响应 encrypted 时解密', async () => {
    const encryptor = {
      shouldEncrypt: (path: string) => path.startsWith('dialog/msg/'),
      encrypt: vi.fn(async (body?: Record<string, unknown>) => ({ header: 'client_type=pgp;client_key=K', body: body && { encrypted: 'E' } })),
      decrypt: vi.fn(async () => ({ ret: 1, msg: 'ok', data: { plain: true } })),
    };
    const { client, calls } = setup([{ encrypted: 'X' }, { ret: 1, data: {} }], { encryptor });
    await expect(client.request('dialog/msg/list', { data: { dialog_id: 1 } })).resolves.toEqual({ data: { plain: true }, msg: 'ok' });
    expect(calls[0].init.method).toBe('POST');
    expect(calls[0].init.body).toBe('{"encrypted":"E"}');
    expect(calls[0].init.headers).toMatchObject({ encrypt: 'client_type=pgp;client_key=K' });
    await client.request('users/info');
    expect(encryptor.encrypt).toHaveBeenCalledTimes(1);
  });
});

describe('错误分类', () => {
  const kindOf = (p: Promise<unknown>) => p.catch((e: ApiError) => [e.kind, e.ret]);

  it('ret !== 1 为 server，带上服务端的 ret、msg、data', async () => {
    const { client } = setup([{ ret: 0, msg: '参数错误', data: { x: 1 } }]);
    const err = await client.request('x').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ kind: 'server', ret: 0, message: '参数错误', data: { x: 1 } });
  });

  it('fetch 抛错为 network', async () => {
    const { client } = setup([new TypeError('Failed to fetch')]);
    expect(await kindOf(client.request('x'))).toEqual(['network', 0]);
  });

  it('超时中断为 network', async () => {
    vi.useFakeTimers();
    const fetchMock = (_: string, init: RequestInit) =>
      new Promise<Response>((_resolve, reject) => init.signal!.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))));
    const { client } = setup([], { fetch: fetchMock as typeof fetch });
    const pending = kindOf(client.request('x', { timeout: 1000 }));
    await vi.advanceTimersByTimeAsync(1000);
    expect(await pending).toEqual(['network', 0]);
    vi.useRealTimers();
  });

  it('响应不是 JSON、不是对象或缺 ret 为 invalid', async () => {
    const { client } = setup([NOT_JSON, [1], { msg: 'x' }]);
    for (let i = 0; i < 3; i++) expect(await kindOf(client.request('x'))).toEqual(['invalid', 0]);
  });

  it('没有服务器地址为 no-server，且不发请求', async () => {
    const fetchMock = vi.fn();
    const client = createApiClient({ getServer: () => '', getToken: () => '', language: () => 'zh', version: '1', platform: 'web', fetch: fetchMock });
    expect(await kindOf(client.request('x'))).toEqual(['no-server', 0]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('全局返回码', () => {
  it('-1 触发 onAuthLost 并传服务端提示，checkAuth=false 时不触发', async () => {
    const onAuthLost = vi.fn();
    const { client } = setup([{ ret: -1, msg: '请登录' }, { ret: -1, msg: '' }], { hooks: { onAuthLost } });
    await expect(client.request('x')).rejects.toMatchObject({ kind: 'server', ret: RET.AUTH_LOST });
    await expect(client.request('x', { checkAuth: false })).rejects.toBeInstanceOf(ApiError);
    expect(onAuthLost.mock.calls).toEqual([['请登录']]);
  });

  it('-2 补填昵称后自动重试', async () => {
    const onNeedProfile = vi.fn(async () => {});
    const { client, calls } = setup([{ ret: -2, msg: '' }, { ret: 1, msg: 'ok', data: 7 }], { hooks: { onNeedProfile } });
    await expect(client.request('x')).resolves.toEqual({ data: 7, msg: 'ok' });
    expect(onNeedProfile).toHaveBeenCalledWith('nickname');
    expect(calls).toHaveLength(2);
  });

  it('-3 用户取消补填时原样抛出服务端错误，checkProfile=false 时不询问', async () => {
    const onNeedProfile = vi.fn(async () => Promise.reject(new Error('cancel')));
    const { client, calls } = setup([{ ret: -3, msg: '请设置联系电话' }, { ret: -3, msg: '' }], { hooks: { onNeedProfile } });
    await expect(client.request('x')).rejects.toMatchObject({ kind: 'server', ret: RET.NEED_TEL, message: '请设置联系电话' });
    await expect(client.request('x', { checkProfile: false })).rejects.toMatchObject({ ret: RET.NEED_TEL });
    expect(onNeedProfile.mock.calls).toEqual([['tel']]);
    expect(calls).toHaveLength(2);
  });

  it('-4001/-4002/-4003 通知上层清理，-4004 刷新父任务，都仍以错误结束', async () => {
    const onGone = vi.fn();
    const onTaskParentStale = vi.fn();
    const { client } = setup(
      [
        { ret: -4001, data: { project_id: 3 } },
        { ret: -4002, data: { task_id: '5', force: 1 } },
        { ret: -4003, data: { dialog_id: 9 } },
        { ret: -4004, data: { task_id: 6 } },
      ],
      { hooks: { onGone, onTaskParentStale } },
    );
    const rets: number[] = [];
    for (let i = 0; i < 4; i++) await client.request('x').catch((e: ApiError) => rets.push(e.ret));
    expect(rets).toEqual([RET.PROJECT_GONE, RET.TASK_GONE, RET.DIALOG_GONE, RET.TASK_PARENT_STALE]);
    expect(onGone.mock.calls).toEqual([
      ['project', 3, { project_id: 3 }],
      ['task', 5, { task_id: '5', force: 1 }],
      ['dialog', 9, { dialog_id: 9 }],
    ]);
    expect(onTaskParentStale).toHaveBeenCalledWith(6);
  });
});
