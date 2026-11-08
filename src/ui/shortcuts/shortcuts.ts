import type { ShortcutOptions } from './types';

/** App 上没有键盘快捷键（外接键盘不在范围内），注册是空操作。Web 版见 shortcuts.web.ts */
export function useShortcut(combo: string, handler: () => void, options?: ShortcutOptions): void {}

/** App 上的菜单是系统菜单，不显示快捷键 */
export function shortcutLabel(combo: string): string {
  return '';
}
