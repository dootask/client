import { router } from 'expo-router';

/** 打开用户资料（App 推入整页，网页居中卡片）；AI 助手等非真人（userid ≤ 0）没有资料 */
export function openProfile(userid: number) {
  if (userid > 0) router.push({ pathname: '/user/[userid]', params: { userid } });
}

/** 关掉资料页：有上一页就返回，直接打开的回到消息 */
export function closeProfile() {
  if (router.canGoBack()) router.back();
  else router.navigate('/messenger');
}
