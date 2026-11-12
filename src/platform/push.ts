import { DooPush, type DooPushMessage } from 'doopush-react-native-sdk';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
// 只导入用到的部分，避开 expo-notifications 包入口自动注册推送 token 的副作用（同 resources/app）
import { addNotificationResponseReceivedListener, clearLastNotificationResponse, getLastNotificationResponse } from 'expo-notifications/build/NotificationsEmitter';
import type { NotificationResponse } from 'expo-notifications/build/Notifications.types';
import { setBadgeCountAsync } from 'expo-notifications/build/setBadgeCountAsync';
import { Platform } from 'react-native';

/** DooPush 平台分配给 DooTask App 的应用（客户端公开参数，同 resources/app） */
const DOOPUSH_APP = { appId: '10', appKey: 'dp_ak_eSqQPRXcjSR1xXtOrXGcHvjKGVEKarBA' };

let configured = false;
function ensureConfigured() {
  if (configured) return;
  DooPush.configure(DOOPUSH_APP);
  configured = true;
}

/** 注册 DooPush（iOS 首次会弹通知授权），返回要上报服务器的设备信息；拿不到设备 ID 为 null */
export async function registerPushDevice() {
  ensureConfigured();
  const { deviceId, vendor, token } = await DooPush.register();
  if (!deviceId) return null;
  const permission = await DooPush.checkPermissionStatus().catch(() => 'unknown');
  return {
    deviceId: String(deviceId),
    vendor: String(vendor ?? ''),
    pushToken: token ?? '',
    // 同旧壳：iOS 为机型标识（如 iPhone14,2），Android 为 Build.MODEL
    model: (Platform.OS === 'ios' ? Device.modelId : Device.modelName) ?? '',
    versionCode: Application.nativeBuildVersion ?? '',
    versionName: Application.nativeApplicationVersion ?? '',
    notified: permission === 'authorized' || permission === 'provisional',
  };
}

/** 本机已注册的 DooPush 设备 ID，没注册过为 null */
export async function pushDeviceId(): Promise<string | null> {
  ensureConfigured();
  return DooPush.getDeviceId().catch(() => null);
}

/** 点通知要打开的位置 */
export interface PushTarget {
  dialogId: number;
  msgId: number;
}

function pickTarget(data: unknown): PushTarget | null {
  if (!data || typeof data !== 'object') return null;
  let record = data as Record<string, unknown>;
  // DooPush 只透传 data 字段：业务字段以 JSON 字符串放在 data 里
  if (record.dialog_id === undefined && typeof record.data === 'string') {
    try {
      const parsed: unknown = JSON.parse(record.data);
      if (!parsed || typeof parsed !== 'object') return null;
      record = parsed as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  const dialogId = Number(record.dialog_id);
  if (!Number.isInteger(dialogId) || dialogId <= 0) return null;
  const msgId = Number(record.msg_id);
  return { dialogId, msgId: Number.isInteger(msgId) && msgId > 0 ? msgId : 0 };
}

/**
 * 订阅点通知（前台、后台、冷启动）。iOS 走 expo-notifications 的通知响应（含冷启动），其他通道走 DooPush 的点击事件；
 * 同一条通知可能两路都到，按会话 + 消息去重
 */
export function onPushOpen(listener: (target: PushTarget) => void): () => void {
  const handled = new Set<string>();
  const receive = (data: unknown) => {
    const target = pickTarget(data);
    if (!target) return;
    const key = `${target.dialogId}:${target.msgId}`;
    if (handled.has(key)) return;
    handled.add(key);
    listener(target);
  };
  const fromResponse = (response: NotificationResponse | null) => {
    if (!response) return;
    // iOS 远程推送的 content.data 只取 Expo 格式的 body，DooPush 载荷在 trigger.payload（完整 userInfo）
    const trigger = response.notification.request.trigger as { payload?: unknown } | null;
    receive(trigger?.payload ?? response.notification.request.content.data);
    clearLastNotificationResponse();
  };
  const fromDooPush = (message: DooPushMessage) => receive(message.data);
  ensureConfigured();
  const subscriptions = [
    addNotificationResponseReceivedListener(fromResponse),
    DooPush.addNotificationClickListener(fromDooPush),
    DooPush.addNotificationOpenListener(fromDooPush),
  ];
  fromResponse(getLastNotificationResponse());
  return () => subscriptions.forEach((sub) => sub.remove());
}

/** 桌面图标角标。Android 用 DooPush 的厂商实现（expo-notifications 识别不了华为等桌面，同 resources/app） */
export async function setAppBadge(count: number): Promise<void> {
  const value = Math.min(0x7fffffff, Math.max(0, Math.floor(count)));
  if (Platform.OS === 'android') {
    ensureConfigured();
    await DooPush.setBadge(value);
  } else {
    await setBadgeCountAsync(value);
  }
}
