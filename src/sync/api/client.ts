import { ApiError, RET } from './errors';

export type ApiMethod = 'get' | 'post';

/** 服务端 Base::platform() 认的取值 */
export type ApiPlatform = 'android' | 'ios' | 'win' | 'mac' | 'web';

export interface ApiResult<T> {
  data: T;
  msg: string;
}

export interface RequestOptions {
  method?: ApiMethod;
  data?: Record<string, unknown>;
  /** 额外请求头，覆盖默认值 */
  headers?: Record<string, string>;
  /** 超时毫秒，默认 30 秒 */
  timeout?: number;
  /** 是否走 PGP 加密；不传时按 encryptor.shouldEncrypt 判断 */
  encrypt?: boolean;
  /** 遇到 -1 时是否触发全局「身份丢失」，默认 true */
  checkAuth?: boolean;
  /** 遇到 -2 / -3 时是否触发补填昵称、电话，默认 true */
  checkProfile?: boolean;
}

/** 加密插件（W6 实现）。不提供时一律明文 */
export interface ApiEncryptor {
  shouldEncrypt(path: string): boolean;
  /** 返回 encrypt 请求头和替换后的请求体；body 为 undefined 时只声明客户端公钥 */
  encrypt(body: Record<string, unknown> | undefined): Promise<{ header: string; body?: Record<string, unknown> }>;
  decrypt(encrypted: string): Promise<unknown>;
}

/** 特殊返回码的全局处理，由上层注入，数据层本身不碰界面 */
export interface ApiHooks {
  /**
   * msg 是服务端提示，可能为空，由界面层兜底；token 是这个请求带的 token，
   * 上层据此忽略换号前发出、换号后才回来的旧请求
   */
  onAuthLost?(msg: string, token: string): void;
  /** 需要补填昵称或电话；resolve 后自动重试原请求，reject 则原样抛出服务端错误 */
  onNeedProfile?(field: 'nickname' | 'tel'): Promise<void>;
  /** 资源已不存在或无权访问，上层据此清理本地缓存 */
  onGone?(kind: 'project' | 'task' | 'dialog', id: number, data: Record<string, unknown>): void;
  onTaskParentStale?(taskId: number): void;
}

export interface ApiClientOptions {
  /** 服务器地址，如 https://demo.dootask.com（不带 /api） */
  getServer(): string;
  getToken(): string;
  /** 当前 WebSocket 连接 fd，服务端据此不把操作结果推回给发起连接 */
  getFd?(): string;
  language(): string;
  version: string;
  platform: ApiPlatform;
  encryptor?: ApiEncryptor;
  hooks?: ApiHooks;
  fetch?: typeof fetch;
}

/** 与旧前端 $A.newDateString 一致：Date 转成 Y-m-d H:i:s，其余原样 */
function serializeValue(value: unknown): unknown {
  if (value instanceof Date) {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${value.getFullYear()}-${p(value.getMonth() + 1)}-${p(value.getDate())} ${p(value.getHours())}:${p(value.getMinutes())}:${p(value.getSeconds())}`;
  }
  if (Array.isArray(value)) return value.map(serializeValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, serializeValue(v)]));
  }
  return value;
}

/** jQuery.param 风格的查询串，服务端 PHP 按 a[]=1&a[]=2、o[k]=v 解析 */
export function toQuery(data: Record<string, unknown>, prefix = ''): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    // 数组里的标量用 a[]，对象用下标 a[0][k]，与 jQuery.param 一致
    const isObject = value !== null && typeof value === 'object';
    const name = prefix ? `${prefix}[${Array.isArray(data) && !isObject ? '' : key}]` : key;
    if (isObject) {
      const nested = toQuery(value as Record<string, unknown>, name);
      if (nested) parts.push(nested);
    } else {
      parts.push(`${encodeURIComponent(name)}=${encodeURIComponent(value === null ? '' : String(value))}`);
    }
  }
  return parts.join('&');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function idOf(data: unknown, key: string): number {
  const value = data && typeof data === 'object' ? (data as Record<string, unknown>)[key] : undefined;
  return Number(value) || 0;
}

const NOT_JSON = Symbol('not-json');

const GONE = {
  [RET.PROJECT_GONE]: ['project', 'project_id'],
  [RET.TASK_GONE]: ['task', 'task_id'],
  [RET.DIALOG_GONE]: ['dialog', 'dialog_id'],
} as const;

export function createApiClient(options: ApiClientOptions) {
  const doFetch = options.fetch ?? fetch;
  const hooks = options.hooks ?? {};

  function serverOf(): string {
    const server = options.getServer().replace(/\/+$/, '');
    if (!server) throw new ApiError('no-server', 0, 'No server address', {});
    return server;
  }

  function baseHeaders(): Record<string, string> {
    return {
      language: options.language(),
      'dootask-token': options.getToken(),
      fd: options.getFd?.() ?? '',
      version: options.version,
      platform: options.platform,
    };
  }

  /** 按返回码处理响应：成功返回数据，特殊返回码触发全局钩子，其余抛出服务端错误。补填资料后用 retry 重发，没有 retry 的不提示补填 */
  async function settle<T>(json: unknown, path: string, opts: { checkAuth?: boolean; checkProfile?: boolean }, token: string, retry?: () => Promise<ApiResult<T>>): Promise<ApiResult<T>> {
    const ret = isRecord(json) ? Number(json.ret) : NaN;
    if (!isRecord(json) || !Number.isFinite(ret)) {
      throw new ApiError('invalid', 0, `Response of ${path} has no ret`, {});
    }
    const msg = typeof json.msg === 'string' ? json.msg : '';
    const data = (json.data ?? {}) as T;

    if (ret === RET.SUCCESS) return { data, msg };

    if (ret === RET.AUTH_LOST && opts.checkAuth !== false) hooks.onAuthLost?.(msg, token);
    if ((ret === RET.NEED_NICKNAME || ret === RET.NEED_TEL) && opts.checkProfile !== false && retry && hooks.onNeedProfile) {
      const filled = await hooks.onNeedProfile(ret === RET.NEED_NICKNAME ? 'nickname' : 'tel').then(
        () => true,
        () => false,
      );
      if (filled) return retry();
    }
    if (ret in GONE) {
      const [kind, key] = GONE[ret as keyof typeof GONE];
      hooks.onGone?.(kind, idOf(data, key), data as Record<string, unknown>);
    }
    if (ret === RET.TASK_PARENT_STALE) hooks.onTaskParentStale?.(idOf(data, 'task_id'));

    throw new ApiError('server', ret, msg, data);
  }

  async function request<T = unknown>(path: string, opts: RequestOptions = {}): Promise<ApiResult<T>> {
    const server = serverOf();
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...baseHeaders(), ...opts.headers };

    let method: ApiMethod = opts.method ?? 'get';
    let body = opts.data ? (serializeValue(opts.data) as Record<string, unknown>) : undefined;
    const encryptor = options.encryptor;
    const encrypt = !!encryptor && (opts.encrypt ?? encryptor.shouldEncrypt(path));
    if (encrypt && encryptor) {
      const result = await encryptor.encrypt(body);
      headers.encrypt = result.header;
      if (body && result.body) {
        body = result.body;
        method = 'post'; // 加密传输强制 POST
      }
    }

    let url = `${server}/api/${path.replace(/^\/+/, '')}`;
    let payload: string | undefined;
    if (method === 'post') {
      payload = JSON.stringify(body ?? {});
    } else if (body) {
      const query = toQuery(body);
      if (query) url += (url.includes('?') ? '&' : '?') + query;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeout ?? 30000);
    let json: unknown;
    try {
      const res = await doFetch(url, { method: method.toUpperCase(), headers, body: payload, signal: controller.signal });
      // 读响应体也在超时范围内；超时中断算网络失败，其余解析失败算格式错误
      json = await res.json().catch((err: unknown) => (err instanceof Error && err.name === 'AbortError' ? Promise.reject(err) : NOT_JSON));
    } catch (err) {
      throw new ApiError('network', 0, err instanceof Error ? err.message : 'Network request failed', {});
    } finally {
      clearTimeout(timer);
    }
    if (json === NOT_JSON) throw new ApiError('invalid', 0, `Response of ${path} is not JSON`, {});
    if (encrypt && encryptor && isRecord(json) && typeof json.encrypted === 'string') {
      json = await encryptor.decrypt(json.encrypted);
    }
    return settle<T>(json, path, opts, headers['dootask-token']!, () => request<T>(path, opts));
  }

  /**
   * 文件上传（multipart）由平台层传输，这里只给出地址和请求头、按返回码解析响应。
   * 上传不走加密（W6 只加密 JSON 请求体）
   */
  function endpoint(path: string): { url: string; headers: Record<string, string> } {
    return { url: `${serverOf()}/api/${path.replace(/^\/+/, '')}`, headers: baseHeaders() };
  }

  /** 解析上传的响应正文；token 是发出请求时带的 */
  function parse<T = unknown>(path: string, status: number, body: string, token: string): Promise<ApiResult<T>> {
    let json: unknown;
    try {
      json = JSON.parse(body);
    } catch {
      // 网关错误页这类非 JSON 响应按网络问题处理，可以重试
      throw new ApiError('network', 0, `HTTP ${status}`, {});
    }
    return settle<T>(json, path, {}, token);
  }

  return { request, endpoint, parse };
}

export type ApiClient = ReturnType<typeof createApiClient>;
