import { Redirect } from 'expo-router';

/** 启动分流：W11 接入登录状态，未登录去登录页 */
export default function Index() {
  return <Redirect href="/dashboard" />;
}
