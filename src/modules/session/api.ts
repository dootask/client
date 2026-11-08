import { currentLanguage } from '../../i18n';
import { API_PLATFORM, APP_VERSION } from '../../platform';
import { type ApiClientOptions, createApiClient } from '../../sync/api';
import { requestProfile } from './profilePrompt';
import { clearLogin, useSession } from './store';

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
  hooks: {
    onAuthLost: (msg, token) => {
      // 换号前发出、换号后才回来的请求不算
      if (token && token === useSession.getState().token) clearLogin(msg);
    },
    onNeedProfile: requestProfile,
  },
});

/** 还没保存的服务器地址（连接前探测用）：不带 token，不触发全局钩子 */
export function probeClient(server: string) {
  return createApiClient({ ...base, getServer: () => server, getToken: () => '' });
}
