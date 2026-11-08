import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createSocket, type SocketOptions, type WebSocketLike } from './socket';

class FakeSocket implements WebSocketLike {
  static all: FakeSocket[] = [];
  onopen: ((ev: unknown) => void) | null = null;
  onclose: ((ev: unknown) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;
  onmessage: ((ev: { data: unknown }) => void) | null = null;
  sent: Record<string, unknown>[] = [];
  closed = false;

  constructor(public url: string) {
    FakeSocket.all.push(this);
  }
  send(data: string) {
    this.sent.push(JSON.parse(data));
  }
  close() {
    this.closed = true;
  }
  /** 模拟服务端推送 */
  push(msg: unknown) {
    this.onmessage?.({ data: typeof msg === 'string' ? msg : JSON.stringify(msg) });
  }
  serverOpen(fd = 7) {
    this.onopen?.({});
    this.push({ type: 'open', data: { fd, ud: 1 } });
  }
  drop() {
    this.onclose?.({});
  }
}

const latest = () => FakeSocket.all[FakeSocket.all.length - 1];
const flush = () => vi.advanceTimersByTimeAsync(0);

function setup(extra: Partial<SocketOptions> = {}) {
  const socket = createSocket({
    getServer: () => 'https://demo.example.com/',
    getToken: () => 'tok',
    language: () => 'zh',
    platform: 'web',
    WebSocketImpl: FakeSocket,
    random: () => 0.5,
    heartbeatInterval: 0,
    ...extra,
  });
  return socket;
}

beforeEach(() => {
  FakeSocket.all = [];
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('socket', () => {
  it('按协议拼接地址，收到 open 后记录 fd', async () => {
    const socket = setup();
    const opens: unknown[] = [];
    socket.onOpen((info) => opens.push(info));
    socket.connect();
    expect(latest().url).toBe('wss://demo.example.com/ws?action=web&token=tok&language=zh&platform=web');
    expect(socket.state).toBe('connecting');
    latest().serverOpen(42);
    await flush();
    expect(socket.state).toBe('open');
    expect(socket.fd).toBe('42');
    expect(opens).toEqual([{ fd: '42', reconnect: false }]);
  });

  it('没有 token 时不连接', () => {
    const socket = setup({ getToken: () => '' });
    socket.connect();
    expect(FakeSocket.all).toHaveLength(0);
    expect(socket.state).toBe('idle');
  });

  it('断线后指数退避重连，连上后重置退避并标记 reconnect', async () => {
    const socket = setup({ backoff: { min: 1000, max: 4000 } });
    const opens: { reconnect: boolean }[] = [];
    socket.onOpen((info) => opens.push(info));
    socket.connect();
    latest().serverOpen();
    await flush();

    latest().drop();
    await flush();
    expect(socket.state).toBe('closed');
    // random=0.5 时抖动系数 0.75：750、1500、3000、3000（封顶 4000*0.75）
    for (const delay of [750, 1500, 3000, 3000]) {
      const count = FakeSocket.all.length;
      await vi.advanceTimersByTimeAsync(delay - 1);
      expect(FakeSocket.all).toHaveLength(count);
      await vi.advanceTimersByTimeAsync(1);
      expect(FakeSocket.all).toHaveLength(count + 1);
      latest().drop();
    }

    await vi.advanceTimersByTimeAsync(3000);
    latest().serverOpen();
    await flush();
    expect(opens.map((o) => o.reconnect)).toEqual([false, true]);

    latest().drop();
    const count = FakeSocket.all.length;
    await vi.advanceTimersByTimeAsync(750);
    expect(FakeSocket.all).toHaveLength(count + 1);
  });

  it('request 按 msgId 匹配回执，乱序到达也能正确对应', async () => {
    const socket = setup();
    socket.connect();
    latest().serverOpen();
    await flush();

    const a = socket.request('path', { path: '/a' });
    const b = socket.request('path', { path: '/b' });
    const [ma, mb] = latest().sent as { msgId: string }[];
    latest().push({ type: 'receipt', msgId: mb.msgId, data: 'B' });
    latest().push({ type: 'receipt', msgId: ma.msgId, data: 'A' });
    expect(await a).toBe('A');
    expect(await b).toBe('B');
  });

  it('回执超时 reject；断线时未完成的请求立即 reject', async () => {
    const socket = setup({ receiptTimeout: 1000 });
    socket.connect();
    latest().serverOpen();
    await flush();

    const timeout = socket.request('handshake').catch((e: Error) => e.message);
    await vi.advanceTimersByTimeAsync(1000);
    expect(await timeout).toBe('Receipt timeout');

    const dropped = socket.request('handshake').catch((e: Error) => e.message);
    latest().drop();
    await flush();
    expect(await dropped).toBe('Socket closed');
  });

  it('业务推送带 msgId 时回 receipt，并替换 {{RemoteURL}}', async () => {
    const socket = setup();
    const got: unknown[] = [];
    socket.on('dialog', (msg) => got.push(msg.data));
    socket.connect();
    latest().serverOpen();
    await flush();

    latest().push({ type: 'dialog', msgId: 'm1', data: { url: '{{RemoteURL}}uploads/a.png' } });
    await flush();
    expect(got).toEqual([{ url: 'https://demo.example.com/uploads/a.png' }]);
    expect(latest().sent).toContainEqual({ type: 'receipt', msgId: 'm1' });

    // line 由服务端单向推送，不回执
    latest().push({ type: 'line', msgId: 'm2', data: {} });
    await flush();
    expect(latest().sent.filter((m) => m.msgId === 'm2')).toHaveLength(0);
  });

  it('3 秒内重复的帧只处理一次', async () => {
    const socket = setup();
    const got: unknown[] = [];
    socket.on('*', (msg) => got.push(msg.type));
    socket.connect();
    latest().serverOpen();
    await flush();
    got.length = 0;

    const frame = JSON.stringify({ type: 'line', data: { userid: 1, online: true } });
    latest().push(frame);
    latest().push(frame);
    await vi.advanceTimersByTimeAsync(3000);
    latest().push(frame);
    await flush();
    expect(got).toEqual(['line', 'line']);
  });

  it('服务端拒绝（token 无效）时不再重连', async () => {
    const socket = setup();
    const rejected: unknown[] = [];
    socket.onRejected((msg) => rejected.push(msg.data));
    socket.connect();
    latest().push({ type: 'error', data: { error: 'No member' } });
    latest().drop();
    await vi.advanceTimersByTimeAsync(60000);
    expect(rejected).toEqual([{ error: 'No member' }]);
    expect(FakeSocket.all).toHaveLength(1);
  });

  it('check：握手失败立即重连；disconnect 后不再重连', async () => {
    const socket = setup({ receiptTimeout: 500 });
    socket.connect();
    latest().serverOpen();
    await flush();

    const ok = socket.check();
    const hs = latest().sent[0] as { msgId: string };
    expect(hs.msgId).toMatch(/^handshake_/);
    latest().push({ type: 'receipt', msgId: hs.msgId });
    expect(await ok).toBe(true);

    const failed = socket.check();
    await vi.advanceTimersByTimeAsync(500);
    expect(await failed).toBe(false);
    expect(FakeSocket.all).toHaveLength(2);

    socket.disconnect();
    expect(latest().closed).toBe(true);
    await vi.advanceTimersByTimeAsync(60000);
    expect(FakeSocket.all).toHaveLength(2);
    expect(socket.state).toBe('idle');
  });

  it('开启 e2e 时连上后上报公钥，并解密 encrypt 推送', async () => {
    const socket = setup({
      getEncryptKey: async () => 'PUBKEY',
      decrypt: async (s) => JSON.parse(s),
    });
    const got: unknown[] = [];
    socket.on('dialog', (msg) => got.push(msg.data));
    socket.connect();
    latest().serverOpen();
    await flush();
    expect(latest().sent).toContainEqual({ type: 'encrypt', data: { type: 'pgp', key: 'PUBKEY' } });

    latest().push({ type: 'encrypt', encrypted: JSON.stringify({ type: 'dialog', data: { id: 1 } }) });
    await flush();
    expect(got).toEqual([{ id: 1 }]);
  });

  it('加密帧异步解密时，后到的明文帧不会抢先分发', async () => {
    let release!: () => void;
    const socket = setup({
      decrypt: (s) =>
        new Promise((resolve) => {
          release = () => resolve(JSON.parse(s));
        }),
    });
    const got: unknown[] = [];
    socket.on('dialog', (msg) => got.push(msg.data));
    socket.connect();
    latest().serverOpen();
    await flush();

    latest().push({ type: 'encrypt', encrypted: JSON.stringify({ type: 'dialog', data: 1 }) });
    latest().push({ type: 'dialog', data: 2 });
    await flush();
    expect(got).toEqual([]);
    release();
    await flush();
    expect(got).toEqual([1, 2]);
  });

  it('解密期间连接已换，旧连接的帧丢弃', async () => {
    let release!: () => void;
    const socket = setup({
      decrypt: (s) =>
        new Promise((resolve) => {
          release = () => resolve(JSON.parse(s));
        }),
    });
    const got: unknown[] = [];
    socket.on('dialog', (msg) => got.push(msg.data));
    socket.connect();
    latest().serverOpen();
    await flush();

    latest().push({ type: 'encrypt', encrypted: JSON.stringify({ type: 'dialog', msgId: 'm9', data: 1 }) });
    await flush();
    const old = latest();
    socket.reconnect();
    release();
    await flush();
    expect(got).toEqual([]);
    expect(old.sent).toHaveLength(0);
  });

  it('迟迟收不到 open 时按断线处理并重连', async () => {
    const socket = setup({ connectTimeout: 2000, backoff: { min: 1000, max: 1000 } });
    socket.connect();
    await vi.advanceTimersByTimeAsync(2000);
    expect(socket.state).toBe('closed');
    expect(latest().closed).toBe(true);
    await vi.advanceTimersByTimeAsync(750);
    expect(FakeSocket.all).toHaveLength(2);
    latest().serverOpen();
    await vi.advanceTimersByTimeAsync(5000);
    expect(socket.state).toBe('open');
  });

  it('心跳按间隔握手，握手无回执即判定断线并重连', async () => {
    const socket = setup({ heartbeatInterval: 10000, receiptTimeout: 1000 });
    socket.connect();
    latest().serverOpen();
    await flush();

    await vi.advanceTimersByTimeAsync(10000);
    const hs = latest().sent.at(-1) as { type: string; msgId: string };
    expect(hs.type).toBe('handshake');
    latest().push({ type: 'receipt', msgId: hs.msgId });
    await flush();
    expect(FakeSocket.all).toHaveLength(1);

    // 网络断了但没有 close 事件：下一次心跳握手超时后立即重连
    await vi.advanceTimersByTimeAsync(11000);
    expect(FakeSocket.all).toHaveLength(2);
    expect(FakeSocket.all[0].closed).toBe(true);
  });
});
