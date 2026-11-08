import { describe, expect, it } from 'vitest';

import { ApiError } from './errors';
import { createApiClient } from './client';
import { compareVersion, serverVersion, systemSetting } from './system';
import { captcha, login, loginErrorCode, myInfo, needCode, regStatus } from './user';

/**
 * 真实服务端联调，默认跳过：
 *   LIVE_SERVER=<服务器地址> [LIVE_EMAIL=.. LIVE_PASSWORD=..] npx vitest run live
 * 账号只从环境变量读，不要写进文件。
 */
const server = process.env.LIVE_SERVER ?? '';
const email = process.env.LIVE_EMAIL ?? '';
let token = '';
const client = createApiClient({
  getServer: () => server,
  getToken: () => token,
  language: () => 'zh',
  version: '1.0.0',
  platform: 'web',
});

describe.skipIf(!server)('live server', () => {
  it('公开接口', async () => {
    const version = await serverVersion(client);
    expect(compareVersion(version.version, '0.0.1')).toBeGreaterThan(0);
    const setting = await systemSetting(client);
    expect(setting.server_version).toBe(version.version);
    expect(typeof (await needCode(client, 'nobody@example.com'))).toBe('boolean');
    expect((await captcha(client)).img).toMatch(/^data:image\//);
    expect(typeof (await regStatus(client)).enabled).toBe('boolean');
  });

  it('错误密码返回业务错误', async () => {
    const err = await login(client, { email: 'nobody@example.com', password: 'wrong-password' }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ kind: 'server', ret: 0 });
    expect(['need', 'no', undefined]).toContain(loginErrorCode(err));
  });

  it('未登录访问需要身份的接口返回 -1', async () => {
    await expect(myInfo(client)).rejects.toMatchObject({ kind: 'server', ret: -1 });
  });

  it.skipIf(!email)('登录并获取我的信息', async () => {
    const user = await login(client, { email, password: process.env.LIVE_PASSWORD ?? '' });
    token = user.token;
    const me = await myInfo(client);
    expect(me.userid).toBe(user.userid);
    expect(me.email).toBe(email);
  });
});
