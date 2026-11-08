import { currentLanguage } from '../../i18n';
import { API_PLATFORM } from '../../platform';
import { createSocket } from '../../sync/ws';
import { useSession } from './store';

/** 全应用共用的 WebSocket：登录后由消息模块连上，退出登录断开 */
export const socket = createSocket({
  getServer: () => useSession.getState().server,
  getToken: () => useSession.getState().token,
  language: currentLanguage,
  platform: API_PLATFORM,
});
