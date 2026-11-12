import { router, usePreventRemove } from 'expo-router';
import { useState } from 'react';

import { RETURN_TABS, type ReturnTab } from './returnTab';

/** 返回类动作（导航栏返回、系统返回键） */
const BACK_ACTIONS = new Set(['GO_BACK', 'POP']);

/**
 * 同旧版 App：通讯录点进聊天，返回回到通讯录。
 * 拦下出栈，返回类动作先切回来源 Tab，再让聊天在后台出栈（Tab 切换没有动画，看不到中间的会话列表）；其他出栈照常放行
 */
export function useReturnTab(from: string | undefined, enabled: boolean) {
  const [released, setReleased] = useState(false);
  const href = enabled && from && from in RETURN_TABS ? RETURN_TABS[from as ReturnTab] : null;
  usePreventRemove(!!href && !released, ({ data, repeat }) => {
    if (href && BACK_ACTIONS.has(data.action.type)) router.navigate(href);
    setReleased(true);
    repeat();
  });
}
