/** 请求头 platform 的取值（服务端 Base::platform() 认的写法）；桌面端接入 Electron 后按系统分 win / mac */
export const API_PLATFORM = 'web' as const;

/** 当前页面所在的站点；Web 部署在服务端的 /next 下时就是服务器地址 */
export function pageOrigin(): string | null {
  return window.location.origin;
}
