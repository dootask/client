import type { StoredDialog } from '../../../sync/messenger';
import type { Selection } from './selection';

/** 聊天页顶部：导航栏和下方的置顶 / 待办横条；App 多选时换成「已选 n 条 + 取消」 */
export interface ChatTopBarProps {
  dialogId: number;
  dialog: StoredDialog | undefined;
  selection: Selection;
  onJump: (msgId: number) => void;
  /** AI 会话开了新会话或切到历史会话后（App 导航栏里的入口用；网页入口在输入框上方） */
  onSessionChanged: () => void;
}
