import { createServer, connect, type Socket as TcpSocket } from 'node:net';

import { describe, expect, it } from 'vitest';

import { createApiClient, userApi } from '../api';
import { createSocket, type SocketOptions } from './socket';

/**
 * 真实服务端联调，默认跳过：
 *   LIVE_SERVER=<服务器地址> LIVE_EMAIL=.. LIVE_PASSWORD=.. npx vitest run live
 * 断网恢复用例需要 http:// 的服务器地址（中间插一个可以「断网」的 TCP 转发）。
 * 账号只从环境变量读，不要写进文件。
 */
const server = process.env.LIVE_SERVER ?? '';
const email = process.env.LIVE_EMAIL ?? '';

async function loginToken() {
  const api = createApiClient({ getServer: () => server, getToken: () => '', language: () => 'zh', version: '1.0.0', platform: 'web' });
  return (await userApi.login(api, { email, password: process.env.LIVE_PASSWORD ?? '' })).token;
}

function socketFor(serverUrl: string, token: string, extra: Partial<SocketOptions> = {}) {
  return createSocket({ getServer: () => serverUrl, getToken: () => token, language: () => 'zh', platform: 'web', heartbeatInterval: 0, ...extra });
}

/** 等到 predicate 成立，超时失败 */
async function until(predicate: () => boolean, timeout: number) {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeout) throw new Error('until timeout');
    await new Promise((r) => setTimeout(r, 50));
  }
}

/**
 * 本地 TCP 转发，模拟断网：blackhole 时连接不断开、数据全丢（手机信号丢失时的真实情况，
 * 客户端收不到 close 事件），新连接也连不上上游
 */
function createForwarder(target: URL) {
  let blackhole = false;
  const pairs = new Set<TcpSocket>();
  const proxy = createServer((client) => {
    pairs.add(client);
    client.on('close', () => pairs.delete(client));
    client.on('error', () => {});
    if (blackhole) return;
    const upstream = connect(Number(target.port || 80), target.hostname);
    upstream.on('error', () => client.destroy());
    client.on('close', () => upstream.destroy());
    upstream.on('close', () => client.destroy());
    client.on('data', (chunk) => !blackhole && upstream.write(chunk));
    upstream.on('data', (chunk) => !blackhole && client.write(chunk));
  });
  return {
    listen: () => new Promise<number>((resolve) => proxy.listen(0, '127.0.0.1', () => resolve((proxy.address() as { port: number }).port))),
    setBlackhole(value: boolean) {
      blackhole = value;
    },
    close() {
      pairs.forEach((s) => s.destroy());
      proxy.close();
    },
  };
}

describe.skipIf(!server || !email)('live websocket', () => {
  it('连接拿到 fd、握手回执、主动断开', async () => {
    const socket = socketFor(server, await loginToken());
    const opened = new Promise<{ fd: string }>((resolve) => socket.onOpen(resolve));
    socket.connect();
    expect(Number((await opened).fd)).toBeGreaterThan(0);
    expect(await socket.check()).toBe(true);
    socket.disconnect();
    expect(socket.state).toBe('idle');
  });

  it.skipIf(!server.startsWith('http://'))('断网（无 close 事件）后心跳发现，恢复后自动重连', async () => {
    const forwarder = createForwarder(new URL(server));
    const port = await forwarder.listen();
    const socket = socketFor(`http://127.0.0.1:${port}`, await loginToken(), {
      heartbeatInterval: 2000,
      receiptTimeout: 1000,
      connectTimeout: 2000,
      backoff: { min: 500, max: 2000 },
    });
    const opens: { fd: string; reconnect: boolean }[] = [];
    const states: string[] = [];
    socket.onOpen((info) => opens.push(info));
    socket.onState((s) => states.push(s));
    socket.connect();
    await until(() => opens.length === 1, 5000);

    forwarder.setBlackhole(true);
    // 心跳握手超时 → 重连 → 连接超时 → 退避再试，期间一直连不上
    await until(() => states.includes('closed'), 6000);
    await new Promise((r) => setTimeout(r, 4000));
    expect(socket.state).not.toBe('open');
    expect(opens).toHaveLength(1);

    forwarder.setBlackhole(false);
    await until(() => opens.length === 2, 10000);
    expect(opens[1].reconnect).toBe(true);
    expect(opens[1].fd).not.toBe(opens[0].fd);
    expect(await socket.check()).toBe(true);
    socket.disconnect();
    forwarder.close();
  }, 30000);
});
