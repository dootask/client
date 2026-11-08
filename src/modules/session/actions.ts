import { ApiError, systemApi, userApi } from '../../sync/api';
import { serverCandidates } from './address';
import { api, probeClient } from './api';
import { clearLogin, saveServer, saveUser, setOutdated, useSession } from './store';

/**
 * 本客户端要求的最低服务端版本（architecture.md 第 11 节）。正式取值是新客户端首个正式版发布时的服务端版本，
 * 发布前先用开发时对接的版本
 */
export const MIN_SERVER_VERSION = '1.10.38';

const outdatedVersion = (version: string) => (systemApi.compareVersion(version, MIN_SERVER_VERSION) < 0 ? version : null);

/**
 * 连接服务器：能取到版本号才保存。换了服务器原来的登录作废；版本过低也保存（由升级提示页接手）。
 * 失败抛 ApiError：地址写法不对是 no-server，连不上是 network，不是 DooTask 服务器是 invalid
 */
export async function connectServer(input: string): Promise<void> {
  const candidates = serverCandidates(input);
  let error: unknown = new ApiError('no-server', 0, 'Invalid server address', {});
  for (const server of candidates) {
    try {
      const { version } = await systemApi.serverVersion(probeClient(server));
      saveServer(server, outdatedVersion(version));
      return;
    } catch (err) {
      error = err;
    }
  }
  throw error;
}

/** 后台核对当前服务器的版本；已登录时顺便刷新我的信息（服务端可能换发 token）。启动时调 */
export async function refreshSession(): Promise<void> {
  const { server, token } = useSession.getState();
  if (!server) return;
  const { version } = await systemApi.serverVersion(api);
  const outdated = outdatedVersion(version);
  setOutdated(outdated);
  if (!token || outdated) return;
  const user = await userApi.myInfo(api);
  // 请求期间退出或换了号，结果作废
  if (useSession.getState().token === token) saveUser(user);
}

export async function signIn(params: userApi.LoginParams): Promise<void> {
  saveUser(await userApi.login(api, params));
}

/** 退出登录：通知服务端（不等结果，断网也能立即退出），本地清掉登录 */
export function signOut(): void {
  // 请求头在发出时同步取 token，先发请求再清本地
  void userApi.logout(api).catch(() => {});
  clearLogin(null);
}
