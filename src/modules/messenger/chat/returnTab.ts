import { router } from 'expo-router';

/** 可以作为来源的 Tab：从这里打开的聊天，返回时回到它 */
export const RETURN_TABS = { contacts: '/contacts' } as const;
export type ReturnTab = keyof typeof RETURN_TABS;

/** 从别的 Tab 打开会话（窄屏聊天在「消息」Tab 的栈里，返回本来会落到会话列表） */
export function openDialogFrom(tab: ReturnTab, dialogId: number) {
  router.navigate({ pathname: '/messenger/[dialogId]', params: { dialogId: String(dialogId), from: tab } });
}
