import { afterAll, describe, expect, it, vi } from 'vitest';

import { type ApiClient, createApiClient, userApi } from '../api';
import { createSocket } from '../ws';
import { bindMessengerApi, createMessenger, type IncomingMessage, type Messenger } from './engine';
import { memoryCache, memoryKv, noFiles } from './testing';

/**
 * 消息数据层对真实服务端联调，默认跳过。需要两个账号：A 收消息（跑引擎），B 发消息。
 *   LIVE_SERVER=.. LIVE_EMAIL=.. LIVE_PASSWORD=.. LIVE_EMAIL2=.. LIVE_PASSWORD2=.. npx vitest run live
 * 账号只从环境变量读，不要写进文件。
 */
const server = process.env.LIVE_SERVER ?? '';
const emailB = process.env.LIVE_EMAIL2 ?? '';

interface Account {
  client: ApiClient;
  userid: number;
  token: string;
}

async function signIn(email: string, password: string, getFd?: () => string): Promise<Account> {
  const account = { userid: 0, token: '' } as Account;
  account.client = createApiClient({
    getServer: () => server,
    getToken: () => account.token,
    getFd,
    language: () => 'zh',
    version: '1.0.0',
    platform: 'web',
  });
  const user = await userApi.login(account.client, { email, password });
  account.userid = user.userid;
  account.token = user.token;
  return account;
}

describe.skipIf(!server || !emailB)('live messenger', () => {
  let messenger: Messenger;
  let socket: ReturnType<typeof createSocket>;
  afterAll(() => {
    messenger?.stop();
    socket?.disconnect();
  });

  it('同步列表、收推送、分页、已读、发送', { timeout: 60_000 }, async () => {
    let fdA = '';
    const a = await signIn(process.env.LIVE_EMAIL ?? '', process.env.LIVE_PASSWORD ?? '', () => fdA);
    const b = await signIn(emailB, process.env.LIVE_PASSWORD2 ?? '');
    socket = createSocket({ getServer: () => server, getToken: () => a.token, language: () => 'zh', platform: 'web', heartbeatInterval: 0 });
    const opened = new Promise<void>((resolve) => socket.onOpen(({ fd }) => ((fdA = fd), resolve())));

    messenger = createMessenger({ api: bindMessengerApi(a.client, noFiles), socket, cache: memoryCache(), kv: memoryKv(), userId: a.userid });
    const s = () => messenger.store.getState();
    await messenger.start();
    socket.connect();
    await opened;
    await vi.waitFor(() => expect(s().synced).toBe(true), { timeout: 20_000 });
    expect(Object.keys(s().dialogs).length).toBeGreaterThan(0);

    // B 打开和 A 的单聊并发消息：A 收到推送，未读 +1，最后消息更新
    const { data: dialog } = await b.client.request<{ id: number }>('dialog/open/user', { data: { userid: a.userid } });
    const incoming: IncomingMessage[] = [];
    messenger.onIncoming((e) => incoming.push(e));
    const before = s().dialogs[dialog.id]?.unread ?? 0;
    const text = `N1 联调 ${Date.now()}`;
    const { data: sent } = await b.client.request<{ id: number }>('dialog/msg/sendtext', { method: 'post', data: { dialog_id: dialog.id, text } });
    await vi.waitFor(() => expect(incoming.some((e) => e.msg.id === sent.id)).toBe(true), { timeout: 10_000 });
    expect(s().dialogs[dialog.id]).toMatchObject({ unread: before + 1, last_msg: { id: sent.id } });

    // A 打开会话：最新一页在窗口里，往前翻接得上
    await messenger.openDialog(dialog.id);
    const win = () => s().windows[dialog.id]!;
    expect(win().list[0]!.id).toBe(sent.id);
    const firstPage = win().list.length;
    if (firstPage >= 50) {
      await messenger.loadEarlier(dialog.id);
      expect(win().list.length).toBeGreaterThan(firstPage);
      const ids = win().list.map((m) => m.id);
      expect(ids).toEqual([...ids].sort((x, y) => y - x));
    }

    // 看到 B 的消息上报已读：服务端未读清零
    for (const m of win().list) messenger.markRead(m);
    await vi.waitFor(async () => expect((await a.client.request<{ unread: number }>('dialog/msg/unread', { data: { dialog_id: dialog.id } })).data.unread).toBe(0), {
      timeout: 10_000,
    });

    // A 通过发送队列回复：成功后进窗口，队列清空
    messenger.sendText({ dialog_id: dialog.id, text: `${text} 回复` });
    await vi.waitFor(() => expect(s().outbox).toEqual([]), { timeout: 10_000 });
    expect(win().list[0]!.userid).toBe(a.userid);
    expect(s().dialogs[dialog.id]!.last_msg?.id).toBe(win().list[0]!.id);

    // 增量同步不出错，会话还在
    await messenger.syncDialogs();
    expect(s().dialogs[dialog.id]).toBeDefined();
  });
});
