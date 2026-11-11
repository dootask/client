// 只导入查询权限的部分，避开 expo-notifications 包入口自动注册推送 token 的副作用（同 resources/app）
import { getPermissionsAsync } from 'expo-notifications/build/NotificationPermissions';
import { IosAuthorizationStatus } from 'expo-notifications/build/NotificationPermissions.types';
import { Linking } from 'react-native';

/** iOS：只把完整授权算开启，临时授权不算（同 resources/app） */
export async function notificationEnabled(): Promise<boolean> {
  try {
    return (await getPermissionsAsync()).ios?.status === IosAuthorizationStatus.AUTHORIZED;
  } catch {
    // 查询失败按没开处理（同 resources/app）
    return false;
  }
}

/** 打开本 App 的系统设置页 */
export const openAppSettings = () => void Linking.openSettings().catch(() => {});
