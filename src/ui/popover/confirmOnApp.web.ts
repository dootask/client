import type { ConfirmOnAppOptions } from './confirmOnApp';

export type { ConfirmOnAppOptions };

/** Web / 桌面：右键菜单里点到的操作直接执行，误点可以再改回来 */
export function confirmOnApp({ onConfirm }: ConfirmOnAppOptions) {
  onConfirm();
}
