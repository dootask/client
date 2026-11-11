import { useEffect, useEffectEvent } from 'react';

import type { MenuKeyboardOptions } from './menuKeyboardTypes';

/**
 * 菜单打开期间的方向键、回车。用捕获阶段抢在获得焦点的行之前处理，免得回车同时触发那一行的按钮；
 * 浏览器焦点跟着高亮走
 */
export function useMenuKeyboard({ onKey, focusRow, focusKey }: MenuKeyboardOptions) {
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (!onKey(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
  });
  useEffect(() => {
    const listener = (event: KeyboardEvent) => onKeyDown(event);
    document.addEventListener('keydown', listener, true);
    return () => document.removeEventListener('keydown', listener, true);
  }, []);

  const focus = useEffectEvent(() => focusRow()?.focus());
  useEffect(() => {
    focus();
  }, [focusKey]);
}
