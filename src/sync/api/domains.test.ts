import { describe, expect, it } from 'vitest';

import { ApiError } from './errors';
import { compareVersion, serverVersion, systemSetting } from './system';
import { captcha, editData, login, loginErrorCode, myInfo, needCode } from './user';
import { setup } from './fakeFetch';

const user = {
  userid: 1,
  email: 'admin@admin.com',
  nickname: 'admin',
  userimg: 'https://demo.example.com/avatar/admin.png',
  identity: ['admin'],
  department: { 1: 3, 3: 5 }, // array_filter 后下标不连续，服务端输出成对象
  token: 'new-token',
  tel: null,
  extra_field: 'kept',
};

describe('user api', () => {
  it('login 用 POST 提交并校验返回的用户对象', async () => {
    const { client, calls } = setup([{ ret: 1, msg: '登录成功', data: user }]);
    const res = await login(client, { email: 'a@b.c', password: 'x', code: '1234', codeKey: 'k' });
    expect(calls[0].init.method).toBe('POST');
    expect(JSON.parse(calls[0].init.body as string)).toEqual({
      type: 'login',
      email: 'a@b.c',
      password: 'x',
      code: '1234',
      code_key: 'k',
    });
    expect(res.department).toEqual([3, 5]);
    expect(res.token).toBe('new-token');
    expect(res.extra_field).toBe('kept');
  });

  it('editData 用 POST 只提交传入的字段', async () => {
    const { client, calls } = setup([{ ret: 1, msg: '修改成功', data: { ...user, tel: '13800000000' } }]);
    const res = await editData(client, { tel: '13800000000' });
    expect(calls[0].url).toBe('https://demo.example.com/api/users/editdata');
    expect(calls[0].init.method).toBe('POST');
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ tel: '13800000000' });
    expect(res.tel).toBe('13800000000');
  });

  it('login 失败时可读出 data.code，且不触发身份丢失', async () => {
    let lost = false;
    const { client } = setup([{ ret: 0, msg: '请输入验证码', data: { code: 'need' } }], {
      hooks: { onAuthLost: () => (lost = true) },
    });
    const err = await login(client, { email: 'a', password: 'b' }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(loginErrorCode(err)).toBe('need');
    expect(lost).toBe(false);
  });

  it('返回结构不符合 schema 时为 invalid，issues 放在 data 里', async () => {
    const { client } = setup([{ ret: 1, msg: '', data: { userid: 'x' } }]);
    const err = await myInfo(client).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.kind).toBe('invalid');
    expect(err.data.path).toBe('users/info');
    expect(err.data.issues.length).toBeGreaterThan(0);
  });

  it('needCode 把 ret=0 视为不需要', async () => {
    const { client } = setup([
      { ret: 1, msg: 'need', data: {} },
      { ret: 0, msg: 'no', data: {} },
      new TypeError('offline'),
    ]);
    expect(await needCode(client, 'a')).toBe(true);
    expect(await needCode(client, 'a')).toBe(false);
    await expect(needCode(client, 'a')).rejects.toMatchObject({ kind: 'network' });
  });

  it('captcha 返回 key 与图片', async () => {
    const { client } = setup([{ ret: 1, msg: '', data: { sensitive: false, key: 'k', img: 'data:image/png;base64,xx' } }]);
    expect(await captcha(client)).toMatchObject({ key: 'k', img: 'data:image/png;base64,xx' });
  });
});

describe('system api', () => {
  it('systemSetting 保留未声明的字段', async () => {
    const data = {
      reg: 'open',
      login_code: 'auto',
      password_policy: 'simple',
      e2e_message: 'close',
      anon_message: 'open',
      system_alias: 'DooTask',
      login_logo: '',
      server_timezone: 'PRC',
      server_version: '1.4.0',
      task_visible: 'close',
    };
    const { client } = setup([{ ret: 1, msg: 'success', data }]);
    expect(await systemSetting(client)).toEqual(data);
  });

  it('serverVersion 兼容 publish 为空数组', async () => {
    const { client } = setup([{ ret: 1, msg: 'success', data: { device_count: 0, version: '1.4.0', publish: [] } }]);
    expect((await serverVersion(client)).version).toBe('1.4.0');
  });

  it('compareVersion', () => {
    expect(compareVersion('1.4.0', '1.10.0')).toBeLessThan(0);
    expect(compareVersion('1.4', '1.4.0')).toBe(0);
    expect(compareVersion('2.0.1', '2.0.0')).toBeGreaterThan(0);
  });
});
