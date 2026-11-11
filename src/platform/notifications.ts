// 只导入查询权限的部分，避开 expo-notifications 包入口自动注册推送 token 的副作用（同 resources/app）
import { getPermissionsAsync } from 'expo-notifications/build/NotificationPermissions';
import { Linking } from 'react-native';

/** Android：系统通知权限有没有开（会话列表顶部「未开启通知权限」条） */
export async function notificationEnabled(): Promise<boolean> {
  try {
    return (await getPermissionsAsync()).status === 'granted';
  } catch {
    // 查询失败按没开处理（同 resources/app）
    return false;
  }
}

/** 打开本 App 的系统设置页 */
export const openAppSettings = () => void Linking.openSettings().catch(() => {});
