import { currentLanguage } from '../../i18n';
import { API_PLATFORM, APP_VERSION } from '../../platform';
import { type ApiClientOptions, createApiClient } from '../../sync/api';
import { requestProfile } from './profilePrompt';
import { socket } from './socket';
import { clearLogin, useSession } from './store';

type GoneHandler = NonNullable<NonNullable<ApiClientOptions['hooks']>['onGone']>;
const goneHandlers = new Set<GoneHandler>();

/** 订阅「资源已不存在或无权访问」（会话、项目、任务），各模块据此清理本地数据 */
export function onGone(fn: GoneHandler): () => void {
  goneHandlers.add(fn);
  return () => goneHandlers.delete(fn);
}

const base: Pick<ApiClientOptions, 'language' | 'version' | 'platform'> = {
  language: currentLanguage,
  version: APP_VERSION,
  platform: API_PLATFORM,
};

/** 全应用共用的接口客户端：服务器地址和 token 每次请求时从登录状态现取 */
export const api = createApiClient({
  ...base,
  getServer: () => useSession.getState().server,
  getToken: () => useSession.getState().token,
  getFd: () => socket.fd,
  hooks: {
    onAuthLost: (msg, token) => {
      // 换号前发出、换号后才回来的请求不算
      if (token && token === useSession.getState().token) clearLogin(msg);
    },
    onNeedProfile: requestProfile,
    onGone: (kind, id, data) => goneHandlers.forEach((fn) => fn(kind, id, data)),
  },
});

/** 还没保存的服务器地址（连接前探测用）：不带 token，不触发全局钩子 */
export function probeClient(server: string) {
  return createApiClient({ ...base, getServer: () => server, getToken: () => '' });
}
