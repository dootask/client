import { Redirect } from 'expo-router';

import { entryHref, useSession } from '../modules/session';

/** 启动分流：按登录状态进升级提示、主框架、登录页或服务器页 */
export default function Index() {
  return <Redirect href={useSession(entryHref)} />;
}
