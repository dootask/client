import type { ApiClient } from './client';

/**
 * App 推送设备接口（主仓库 PushController）：登录后上报 DooPush 设备，服务端按设备推送新消息
 */

/** 上报的设备信息：DooPush 注册结果 + 机型、版本、通知权限 */
export interface PushDevice {
  deviceId: string;
  vendor: string;
  pushToken: string;
  model: string;
  /** 版本代码（构建号） */
  versionCode: string;
  /** 版本名称 */
  versionName: string;
  notified: boolean;
}

export async function updateDevice(client: ApiClient, device: PushDevice): Promise<void> {
  await client.request('push/device', {
    method: 'post',
    data: {
      action: 'update',
      device_id: device.deviceId,
      vendor: device.vendor,
      push_token: device.pushToken,
      device_model: device.model,
      app_version: device.versionCode,
      app_version_name: device.versionName,
      is_notified: device.notified ? '1' : '0',
    },
  });
}

/**
 * 解绑设备。服务端按请求头 token 匹配（允许 token 已失效），退出登录时本地 token 已清，所以显式带上原 token；
 * 不触发全局「身份丢失」
 */
export async function removeDevice(client: ApiClient, deviceId: string, token: string): Promise<void> {
  await client.request('push/device', {
    method: 'post',
    data: { action: 'remove', device_id: deviceId },
    headers: { token },
    checkAuth: false,
  });
}
