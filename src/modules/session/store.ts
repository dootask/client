import { create } from 'zustand';

import { userApi } from '../../sync/api';
import { kv, KV_KEYS } from '../../sync/storage';

export interface SessionState {
  /** 服务器地址（不带 /api、不带结尾斜杠），空串为还没设置 */
  server: string;
  /** 登录 token，空串为未登录 */
  token: string;
  /** 我的信息：冷启动先用上次存下的，后台再取新的 */
  user: userApi.MyInfo | null;
  /** 服务器版本低于最低要求时是服务器的版本号，否则为 null */
  outdated: string | null;
  /** 被动回到登录页的原因（身份失效时服务端的提示，可能为空串），登录页显示，null 为没有 */
  notice: string | null;
}

function readUser(): userApi.MyInfo | null {
  const raw = kv.getString(KV_KEYS.user);
  if (!raw) return null;
  try {
    const parsed = userApi.myInfoSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/**
 * 登录状态。模块加载时从键值存储同步读出，冷启动首屏直接按已登录渲染，不闪登录页；
 * 组件外（请求钩子、WebSocket）用 useSession.getState() 读
 */
export const useSession = create<SessionState>()(() => ({
  server: kv.getString(KV_KEYS.server) ?? '',
  token: kv.getString(KV_KEYS.token) ?? '',
  user: readUser(),
  outdated: null,
  notice: null,
}));

export const useSignedIn = () => useSession((state) => state.token !== '');

/** 换了服务器：原来的登录作废 */
export function saveServer(server: string, outdated: string | null): void {
  const changed = server !== useSession.getState().server;
  kv.set(KV_KEYS.server, server);
  if (changed) clearStoredLogin();
  useSession.setState(changed ? { server, outdated, token: '', user: null, notice: null } : { outdated });
}

/** 登录成功，或取我的信息时服务端换发了 token */
export function saveUser(user: userApi.MyInfo): void {
  const token = user.token || useSession.getState().token;
  kv.set(KV_KEYS.token, token);
  kv.set(KV_KEYS.user, JSON.stringify(user));
  useSession.setState({ token, user, notice: null });
}

export function setOutdated(outdated: string | null): void {
  useSession.setState({ outdated });
}

/** 退出或身份失效：清掉登录，服务器地址留着。notice 见 SessionState */
export function clearLogin(notice: string | null): void {
  clearStoredLogin();
  useSession.setState({ token: '', user: null, notice });
}

function clearStoredLogin(): void {
  kv.remove(KV_KEYS.token);
  kv.remove(KV_KEYS.user);
}
