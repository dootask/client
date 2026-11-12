// 网页没有 App 推送：浏览器通知、标题未读数在 messenger 模块里另做

export async function registerPushDevice(): Promise<null> {
  return null;
}

export async function pushDeviceId(): Promise<string | null> {
  return null;
}

export interface PushTarget {
  dialogId: number;
  msgId: number;
}

export function onPushOpen(_listener: (target: PushTarget) => void): () => void {
  return () => {};
}

export async function setAppBadge(_count: number): Promise<void> {}
