import { describe, expect, it } from 'vitest';

import { assistantRunStream, conversationOpen, sendCompose } from './assistant';
import { sendText, sessionCreate, sessionList, sessionOpen, sessionRename } from './dialog';
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

describe('AI 会话接口', () => {
  const session = { id: 3, dialog_id: 10, title: '主题', is_open: 1, created_at: '2026-11-12 10:00:00' };
  it('创建、打开与改名使用对应接口并校验会话字段', async () => {
    const { client, calls } = setup([session, session, { ...session, title: '新主题' }].map((data) => ({ ret: 1, data })));
    expect(await sessionCreate(client, 10)).toMatchObject({ id: 3, dialog_id: 10 });
    expect(await sessionOpen(client, 3)).toMatchObject({ is_open: 1 });
    expect(await sessionRename(client, 3, '新主题')).toMatchObject({ title: '新主题' });
    expect(calls[0]!.url).toContain('/dialog/session/create?');
    expect(calls[1]!.url).toContain('session_id=3');
    expect(calls[2]!.init.method).toBe('POST');
    expect(JSON.parse(calls[2]!.init.body as string)).toEqual({ session_id: 3, title: '新主题' });
  });
  it('历史分页兼容 PHP 数字键列表；发送提问携带选中的模型', async () => {
    const { client, calls } = setup([
      { ret: 1, data: { current_page: 1, last_page: 2, data: { 5: session } } },
      { ret: 1, data: { id: 20, dialog_id: 10, userid: 1, type: 'text', msg: { text: '提问' }, created_at: '2026-11-12 10:00:00' } },
    ]);
    expect(await sessionList(client, { dialog_id: 10, page: 1, pagesize: 50 })).toMatchObject({ current_page: 1, last_page: 2, data: [{ id: 3 }] });
    await sendText(client, { dialog_id: 10, text: '提问', model_name: 'model-a' });
    expect(JSON.parse(calls[1]!.init.body as string)).toEqual({ dialog_id: 10, text: '提问', model_name: 'model-a' });
  });
  it('助手首次打开允许空会话，发送返回文本、图片及过程部分', async () => {
    const userMessage = { id: 1, conversation_id: 2, role: 'user', status: 'done', parts: [{ type: 'text', text: '请写周报' }, { type: 'image', path: 'uploads/a.png' }] };
    const reply = { id: 2, conversation_id: 2, role: 'assistant', status: 'running', parts: [{ type: 'reasoning', text: '分析' }, { type: 'tool', name: 'search', status: 'done' }, { type: 'text', text: '**周报**' }] };
    const { client, calls } = setup([
      { ret: 1, data: { conversation: null, messages: [], run: null } },
      { ret: 1, data: { conversation: { id: 2 }, user_message: userMessage, message: reply, run: { events_url: '/events' } } },
    ]);
    expect(await conversationOpen(client, '10')).toMatchObject({ conversation: null, messages: [] });
    const params = { scope_ref: '10', model_type: 'openai', model_name: 'model-a', text: '请写周报', images: ['uploads/a.png'], system: '写作助手', locale: 'zh' };
    expect(await sendCompose(client, params)).toMatchObject({ user_message: userMessage, message: reply });
    expect(JSON.parse(calls[1]!.init.body as string)).toEqual({ ...params, kind: 'compose', scope: 'message' });
  });
  it('助手流使用 message_id，顶层 null 归一化后仍视为已经结束', async () => {
    const { client, calls } = setup([{ ret: 1, data: null }, { ret: 1, data: { events_url: '/events' } }, { ret: 1, data: { events_url: 123 } }]);
    expect(await assistantRunStream(client, 8)).toBeNull();
    expect(await assistantRunStream(client, 8)).toBe('/events');
    expect(calls[0]!.url).toContain('message_id=8');
    expect(calls[0]!.url).not.toContain('dialog_msg_id');
    await expect(assistantRunStream(client, 8)).rejects.toMatchObject({ kind: 'invalid' });
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
