import { useEffect } from 'react';

import { onPushOpen, pushDeviceId, registerPushDevice } from '../../platform/push';
import { pushApi } from '../../sync/api';
import { api, useSession, type SessionState } from '../session';
import { openDialogRoute } from './DialogList';

/** 推送设备跟着哪个登录走：服务器 + token；未登录或服务器版本过低为空串 */
const bindingOf = (s: SessionState) => (s.token && s.user && !s.outdated ? `${s.server}|${s.token}` : '');

/** 注册、解绑按顺序执行（登录、退出可能连着发生） */
let queue: Promise<void> = Promise.resolve();
function enqueue(task: () => Promise<void>, label: string) {
  queue = queue.then(task).catch((err) => console.warn(`[push] ${label}失败`, err));
}

async function register(binding: string) {
  const device = await registerPushDevice();
  // 注册期间退出或换了号，交给下一轮
  if (!device || bindingOf(useSession.getState()) !== binding) return;
  await pushApi.updateDevice(api, device);
}

async function unregister(token: string) {
  const deviceId = await pushDeviceId();
  if (deviceId) await pushApi.removeDevice(api, deviceId, token);
}

/**
 * App 推送设备（P1）：登录后注册 DooPush 并上报服务器，退出（含身份失效）时用原 token 解绑。应用启动时调一次，返回停止函数；
 * 网页上平台层是空实现
 */
export function startPushDevice(): () => void {
  const initial = bindingOf(useSession.getState());
  if (initial) enqueue(() => register(initial), '注册推送');
  return useSession.subscribe((state, prev) => {
    const next = bindingOf(state);
    const previous = bindingOf(prev);
    if (next === previous) return;
    if (previous && prev.token !== state.token) enqueue(() => unregister(prev.token), '解绑推送');
    if (next) enqueue(() => register(next), '注册推送');
  });
}

/** 点通知打开会话并定位到那条消息（P3）。挂在登录后的主框架里，冷启动时路由已就绪 */
export function usePushOpen(): void {
  useEffect(() => onPushOpen(({ dialogId, msgId }) => openDialogRoute(dialogId, msgId || undefined)), []);
}
