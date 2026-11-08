import { Platform } from 'react-native';

/** 请求头 platform 的取值（服务端 Base::platform() 认的写法） */
export const API_PLATFORM: 'ios' | 'android' = Platform.OS === 'ios' ? 'ios' : 'android';

/** 当前页面所在的站点；只有 Web 有，原生端没有 */
export function pageOrigin(): string | null {
  return null;
}
