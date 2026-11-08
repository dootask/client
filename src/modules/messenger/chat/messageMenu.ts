import * as Clipboard from 'expo-clipboard';
import { Copy, Pencil, Reply, RotateCw, SmilePlus, Trash2, Undo2 } from 'lucide-react-native';
import { useMemo } from 'react';

import { useT } from '../../../i18n';
import type { Msg } from '../../../sync/api/dialog';
import { htmlToText, type OutboxItem } from '../../../sync/messenger';
import type { MsgBody } from '../../../sync/messenger/body';
import { confirmOnApp, type MenuEntry } from '../../../ui/popover';
import { showToast } from '../../../ui/Toast';
import { useErrorText } from '../../session';
import { useMessenger } from '../hooks';
import { REACTIONS } from './emoji';

/** 可复制的纯文字：文字消息的正文、语音的转写 */
function plainText(msg: Msg, body: MsgBody): string {
  if (body.kind === 'record') return body.text;
  if (msg.type !== 'text') return '';
  const data = (msg.msg ?? {}) as { text?: unknown; type?: unknown };
  const text = typeof data.text === 'string' ? data.text : '';
  return data.type === 'md' ? text : htmlToText(text);
}

/**
 * 消息的长按 / 右键菜单：回复、回应、复制、编辑、撤回；发送失败的消息：重新发送、删除。
 * 同一份数据在 App 交给系统菜单、在 Web 上自绘
 */
export function useMessageMenus({ onReply, onEdit }: { onReply: (msg: Msg) => void; onEdit: (msg: Msg) => void }) {
  const t = useT();
  const messenger = useMessenger();
  const errorText = useErrorText();

  return useMemo(() => {
    const menu = (msg: Msg, body: MsgBody, own: boolean): MenuEntry[] => {
      if (!messenger) return [];
      const text = plainText(msg, body);
      const entries: MenuEntry[] = [
        { label: t('messenger:chat.reply'), icon: Reply, onSelect: () => onReply(msg) },
        {
          label: t('messenger:chat.react'),
          icon: SmilePlus,
          children: REACTIONS.map((symbol) => ({ label: symbol, onSelect: () => void messenger.toggleEmoji(msg, symbol).catch((err) => showToast(errorText(err))) })),
        },
      ];
      if (text) {
        entries.push({
          label: t('messenger:chat.copy'),
          icon: Copy,
          onSelect: () => {
            Clipboard.setStringAsync(text)
              .then(() => showToast(t('messenger:chat.copied')))
              .catch(() => {});
          },
        });
      }
      if (own && msg.type === 'text') entries.push({ label: t('messenger:chat.edit'), icon: Pencil, onSelect: () => onEdit(msg) });
      if (own) {
        entries.push('separator', {
          label: t('messenger:chat.withdraw'),
          icon: Undo2,
          destructive: true,
          onSelect: () =>
            confirmOnApp({
              title: t('messenger:chat.withdrawConfirm'),
              confirmLabel: t('messenger:chat.withdraw'),
              cancelLabel: t('messenger:chat.cancel'),
              destructive: true,
              onConfirm: () => void messenger.withdraw(msg).catch((err) => showToast(errorText(err))),
            }),
        });
      }
      return entries;
    };

    const pendingMenu = (item: OutboxItem): MenuEntry[] => {
      if (!messenger || item.state !== 'failed') return [];
      return [
        { label: t('messenger:chat.resend'), icon: RotateCw, onSelect: () => messenger.retrySend(item.localId) },
        { label: t('messenger:chat.delete'), icon: Trash2, destructive: true, onSelect: () => messenger.discardSend(item.localId) },
      ];
    };

    return { menu, pendingMenu };
  }, [t, messenger, errorText, onReply, onEdit]);
}
