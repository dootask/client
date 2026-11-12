import type { Dialog, Msg } from '../api/dialog';
import { msgPreview, type Preview } from './preview';

export interface NotificationContext {
  msg: Pick<Msg, 'dialog_id' | 'userid' | 'type' | 'msg'>;
  silence: boolean | number;
  userId: number;
  foreground: boolean;
  viewingId: number;
}

export interface MessageNotificationInput extends NotificationContext {
  dialog: Pick<Dialog, 'name' | 'type'>;
  senderName: string;
  aiName: string;
  formatPreview: (preview: Preview) => string;
}

export interface MessageNotification {
  title: string;
  body: string;
}

export function shouldNotify({ msg, silence, userId, foreground, viewingId }: NotificationContext): boolean {
  return !silence && msg.userid !== userId && !(foreground && viewingId === msg.dialog_id);
}

/** null 表示不通知；文案由调用方按当前语言提供，两端共用同一套规则。 */
export function messageNotification(input: MessageNotificationInput): MessageNotification | null {
  if (!shouldNotify(input)) return null;
  const { msg, dialog, senderName, aiName, formatPreview } = input;
  const preview = msgPreview(msg)!;
  let sender = senderName;
  if (msg.userid === -1) {
    const data = msg.msg && typeof msg.msg === 'object' ? msg.msg as { nickname?: unknown } : null;
    sender = typeof data?.nickname === 'string' && data.nickname ? data.nickname : aiName;
  }
  return {
    title: dialog.name ?? '',
    body: `${dialog.type === 'group' ? `${sender}: ` : ''}${formatPreview(preview)}`,
  };
}
