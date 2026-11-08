import { Redirect } from 'expo-router';

import { useSession } from '../modules/session';

/** 启动分流：服务器版本过低 → 升级提示；已登录 → 主框架；有服务器 → 登录；否则先填服务器 */
export default function Index() {
  const target = useSession((state) => (state.outdated ? '/upgrade' : state.token ? '/dashboard' : state.server ? '/login' : '/server'));
  return <Redirect href={target} />;
}
