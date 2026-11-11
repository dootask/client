import type { StoredDialog } from '../../../sync/messenger';
import type { Selection } from './selection';

/** 聊天页顶部：导航栏和下方的置顶 / 待办横条；App 多选时换成「已选 n 条 + 取消」 */
export interface ChatTopBarProps {
  dialogId: number;
  dialog: StoredDialog | undefined;
  selection: Selection;
  onJump: (msgId: number) => void;
}
