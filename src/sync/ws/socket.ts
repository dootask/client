import type { ApiPlatform } from '../api';

/**
 * 与服务端 WebSocketService 的长连接。纯 TS，不依赖 React；平台差异（WebSocket 实现、
 * 前后台、网络状态）由上层注入，或通过 check() / reconnect() 驱动。
 *
 * 协议要点（主仓库 app/Services/WebSocketService.php）：
 * - 连接地址 {server}/ws?action=web&token=..&language=..&platform=..
 * - 连上后服务端推 {type:'open', data:{fd, ud}}；token 无效推 {type:'error'} 并断开
 * - 客户端发 {type, msgId, data}；只有 handshake 和服务端不认识的类型会回 {type:'receipt', msgId}，
 *   path、encrypt、receipt 等直接处理不回执
 * - 服务端推送的业务消息带 msgId 时，客户端要回 receipt
 * - 消息里的 {{RemoteURL}} 需替换成服务器根地址
 */

export type SocketState = 'idle' | 'connecting' | 'open' | 'closed';

export interface SocketMessage<T = unknown> {
  type: string;
  msgId?: string;
  data: T;
  [key: string]: unknown;
}

export interface WebSocketLike {
  onopen: ((ev: unknown) => void) | null;
  onclose: ((ev: unknown) => void) | null;
  onerror: ((ev: unknown) => void) | null;
  onmessage: ((ev: { data: unknown }) => void) | null;
  send(data: string): void;
  close(): void;
}

export interface SocketOptions {
  getServer(): string;
  getToken(): string;
  language(): string;
  platform: ApiPlatform;
  WebSocketImpl?: new (url: string) => WebSocketLike;
  /** 连上后上报 PGP 公钥（e2e_message 开启时）；返回 null 则不上报 */
  getEncryptKey?(): Promise<string | null>;
  /** 解密 type=encrypt 的推送 */
  decrypt?(encrypted: string): Promise<unknown>;
  /** 心跳间隔，默认 30 秒；同时用于刷新服务端 PC 端活跃时间。0 表示不发心跳 */
  heartbeatInterval?: number;
  /** 回执超时，默认 6 秒 */
  receiptTimeout?: number;
  /** 建立连接（收到 open）的超时，默认 15 秒；超时按断线处理 */
  connectTimeout?: number;
  /** 重连退避上下限，默认 1 秒 ~ 30 秒 */
  backoff?: { min: number; max: number };
  random?(): number;
  log?(...args: unknown[]): void;
}

type Handler = (msg: SocketMessage) => void;

/** 服务端在协议层处理、不需要客户端回执的类型 */
const NO_RECEIPT = new Set(['open', 'receipt', 'line', 'msgStream', 'operation', 'error']);

/** 服务端偶发重复推送：这段时间内完全相同的帧只处理一次（与旧前端一致） */
const REPEAT_WINDOW = 3000;

function fillRemoteUrl(value: unknown, root: string): unknown {
  if (typeof value === 'string') return value.includes('{{RemoteURL}}') ? value.replace(/\{\{RemoteURL\}\}/g, root) : value;
  if (Array.isArray(value)) return value.map((v) => fillRemoteUrl(v, root));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fillRemoteUrl(v, root)]));
  }
  return value;
}

function isMessage(value: unknown): value is SocketMessage {
  return !!value && typeof value === 'object' && typeof (value as SocketMessage).type === 'string';
}

export function createSocket(options: SocketOptions) {
  const Impl = options.WebSocketImpl ?? (globalThis.WebSocket as unknown as new (url: string) => WebSocketLike);
  const heartbeatInterval = options.heartbeatInterval ?? 30000;
  const receiptTimeout = options.receiptTimeout ?? 6000;
  const connectTimeout = options.connectTimeout ?? 15000;
  const backoff = options.backoff ?? { min: 1000, max: 30000 };
  const random = options.random ?? Math.random;
  const log = options.log ?? (() => {});

  let ws: WebSocketLike | null = null;
  let state: SocketState = 'idle';
  let fd = '';
  let attempts = 0;
  let openCount = 0;
  let enabled = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let connectTimer: ReturnType<typeof setTimeout> | undefined;
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  let msgSeq = 0;
  let last = { raw: '', at: 0 };
  /** 帧和断开事件按到达顺序处理：加密推送要异步解密，不排队的话后到的明文帧会先分发 */
  let queue: Promise<void> = Promise.resolve();

  const pending = new Map<string, { resolve(data: unknown): void; reject(err: Error): void; timer: ReturnType<typeof setTimeout> }>();
  const handlers = new Map<string, Set<Handler>>();
  const stateListeners = new Set<(state: SocketState) => void>();
  const openListeners = new Set<(info: { fd: string; reconnect: boolean }) => void>();
  const rejectListeners = new Set<(msg: SocketMessage) => void>();

  function setState(next: SocketState) {
    if (state === next) return;
    state = next;
    stateListeners.forEach((fn) => fn(next));
  }

  function rejectPending(reason: string) {
    pending.forEach(({ reject, timer }) => {
      clearTimeout(timer);
      reject(new Error(reason));
    });
    pending.clear();
  }

  function teardown() {
    clearTimeout(reconnectTimer);
    clearTimeout(connectTimer);
    clearInterval(heartbeatTimer);
    reconnectTimer = connectTimer = heartbeatTimer = undefined;
    if (ws) {
      ws.onopen = ws.onclose = ws.onerror = ws.onmessage = null;
      try {
        ws.close();
      } catch {}
      ws = null;
    }
    fd = '';
    rejectPending('Socket closed');
  }

  /** 当前连接断了：清理后按退避重连 */
  function lost(socket: WebSocketLike) {
    if (ws !== socket) return;
    teardown();
    setState('closed');
    scheduleReconnect();
  }

  function scheduleReconnect() {
    if (!enabled || reconnectTimer) return;
    // 指数退避 + 50% 抖动，避免服务端重启后所有客户端同时重连
    const base = Math.min(backoff.max, backoff.min * 2 ** attempts);
    const delay = Math.round(base * (0.5 + random() / 2));
    attempts++;
    log('[WS] reconnect in', delay);
    reconnectTimer = setTimeout(() => {
      reconnectTimer = undefined;
      open();
    }, delay);
  }

  function dispatch(msg: SocketMessage) {
    handlers.get(msg.type)?.forEach((fn) => fn(msg));
    handlers.get('*')?.forEach((fn) => fn(msg));
  }

  async function handleRaw(socket: WebSocketLike, raw: unknown) {
    if (ws !== socket || typeof raw !== 'string') return;
    const now = Date.now();
    if (raw === last.raw && now - last.at < REPEAT_WINDOW) return;
    last = { raw, at: now };

    let msg: unknown;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    if (!isMessage(msg)) return;
    if (msg.type === 'encrypt' && typeof msg.encrypted === 'string') {
      if (!options.decrypt) return;
      try {
        msg = await options.decrypt(msg.encrypted);
      } catch (err) {
        log('[WS] decrypt failed', err);
        return;
      }
      // 解密期间连接可能已经换了
      if (ws !== socket || !isMessage(msg)) return;
    }
    const message = fillRemoteUrl(msg, `${options.getServer().replace(/\/+$/, '')}/`) as SocketMessage;

    switch (message.type) {
      case 'open': {
        clearTimeout(connectTimer);
        connectTimer = undefined;
        fd = String((message.data as { fd?: unknown })?.fd ?? '');
        attempts = 0;
        openCount++;
        setState('open');
        startHeartbeat();
        void reportEncryptKey();
        const reconnect = openCount > 1;
        openListeners.forEach((fn) => fn({ fd, reconnect }));
        break;
      }
      case 'error':
        // token 无效（No member）：不再自动重连，交给上层校验登录态
        enabled = false;
        rejectListeners.forEach((fn) => fn(message));
        break;
      case 'receipt': {
        const entry = message.msgId ? pending.get(message.msgId) : undefined;
        if (entry) {
          clearTimeout(entry.timer);
          pending.delete(message.msgId!);
          entry.resolve(message.data);
        }
        return;
      }
      default:
        if (message.msgId && !NO_RECEIPT.has(message.type)) send('receipt', undefined, message.msgId);
    }
    dispatch(message);
  }

  async function reportEncryptKey() {
    if (!options.getEncryptKey) return;
    try {
      const key = await options.getEncryptKey();
      if (key) send('encrypt', { type: 'pgp', key });
    } catch (err) {
      log('[WS] encrypt key failed', err);
    }
  }

  function startHeartbeat() {
    clearInterval(heartbeatTimer);
    if (heartbeatInterval <= 0) return;
    heartbeatTimer = setInterval(() => void check(), heartbeatInterval);
  }

  function open() {
    teardown();
    const server = options.getServer().replace(/\/+$/, '');
    const token = options.getToken();
    if (!enabled || !server || !token) {
      setState('idle');
      return;
    }
    const query = new URLSearchParams({ action: 'web', token, language: options.language(), platform: options.platform });
    const url = `${server.replace(/^http/, 'ws')}/ws?${query.toString()}`;
    setState('connecting');
    let socket: WebSocketLike;
    try {
      socket = new Impl(url);
    } catch (err) {
      log('[WS] create failed', err);
      setState('closed');
      scheduleReconnect();
      return;
    }
    ws = socket;
    socket.onmessage = (ev) => {
      queue = queue.then(() => handleRaw(socket, ev.data));
    };
    // 断开也排进队列：服务端先推 error 再断开，要先处理完 error
    socket.onclose = socket.onerror = () => {
      queue = queue.then(() => lost(socket));
    };
    // 网络半通时可能既不 open 也不 close，超时按断线处理
    connectTimer = setTimeout(() => {
      log('[WS] connect timeout');
      lost(socket);
    }, connectTimeout);
  }

  /** 发送消息；未连接时返回 false */
  function send(type: string, data?: unknown, msgId?: string): boolean {
    if (!ws || state !== 'open') return false;
    try {
      ws.send(JSON.stringify({ type, msgId, data }));
      return true;
    } catch {
      return false;
    }
  }

  /** 发送并等待服务端回执；只对会回执的类型（handshake 等）有意义 */
  function request<T = unknown>(type: string, data?: unknown, timeout = receiptTimeout): Promise<T> {
    return new Promise((resolve, reject) => {
      const msgId = `${type}_${++msgSeq}_${Math.floor(random() * 1e6)}`;
      const timer = setTimeout(() => {
        pending.delete(msgId);
        reject(new Error('Receipt timeout'));
      }, timeout);
      pending.set(msgId, { resolve: resolve as (d: unknown) => void, reject, timer });
      if (!send(type, data, msgId)) {
        clearTimeout(timer);
        pending.delete(msgId);
        reject(new Error('Socket not open'));
      }
    });
  }

  /**
   * 探活：握手失败或超时就立即重连。App 回到前台、网络恢复、心跳时调用。
   * 返回 true 表示连接正常。
   */
  async function check(): Promise<boolean> {
    if (!enabled || state === 'connecting') return false;
    if (state !== 'open') {
      reconnect();
      return false;
    }
    try {
      await request('handshake');
      return true;
    } catch {
      reconnect();
      return false;
    }
  }

  /** 立即重连（重置退避） */
  function reconnect() {
    if (!enabled) return;
    attempts = 0;
    open();
  }

  function on<T = unknown>(type: string, handler: (msg: SocketMessage<T>) => void): () => void {
    let set = handlers.get(type);
    if (!set) handlers.set(type, (set = new Set()));
    set.add(handler as Handler);
    return () => set.delete(handler as Handler);
  }

  function subscribe<T>(set: Set<T>, fn: T): () => void {
    set.add(fn);
    return () => set.delete(fn);
  }

  return {
    /** 开始连接（登录后调用）；之后断线会自动重连 */
    connect() {
      enabled = true;
      reconnect();
    },
    /** 主动断开（退出登录），不再重连 */
    disconnect() {
      enabled = false;
      teardown();
      setState('idle');
    },
    reconnect,
    check,
    send: (type: string, data?: unknown) => send(type, data),
    request,
    /** 按 type 订阅推送，'*' 订阅全部；返回取消订阅函数 */
    on,
    /** 连上（含重连）时触发；reconnect=true 时上层应做一次增量同步 */
    onOpen: (fn: (info: { fd: string; reconnect: boolean }) => void) => subscribe(openListeners, fn),
    /** 服务端拒绝连接（token 无效） */
    onRejected: (fn: (msg: SocketMessage) => void) => subscribe(rejectListeners, fn),
    onState: (fn: (state: SocketState) => void) => subscribe(stateListeners, fn),
    get state() {
      return state;
    },
    /** 当前连接 fd，供 API 请求头使用 */
    get fd() {
      return fd;
    },
  };
}

export type Socket = ReturnType<typeof createSocket>;
