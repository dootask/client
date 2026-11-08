import { Stack } from 'expo-router';

/** 登录前的几页：服务器、登录、升级提示 */
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
