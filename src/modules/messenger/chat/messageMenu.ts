import * as Clipboard from 'expo-clipboard';
import {
  Captions, Copy, Flag, FlagOff, Forward, Languages, ListChecks, ListTodo, ListX, Pencil, Pin, PinOff, Reply, RotateCw, SmilePlus, Star, StarOff,
  TextSelect, Trash2, Undo2,
} from 'lucide-react-native';
import { useMemo } from 'react';

import { useT } from '../../../i18n';
import type { Msg } from '../../../sync/api/dialog';
import { htmlToText, type OutboxItem } from '../../../sync/messenger';
import type { MsgBody } from '../../../sync/messenger/body';
import { confirmOnApp, type MenuAction, type MenuEntry } from '../../../ui/popover';
import { showToast } from '../../../ui/Toast';
import { useErrorText } from '../../session';
import { useMessenger, useMsgActions } from '../hooks';
import { REACTIONS } from './emoji';
import { menuTraits } from './menuTraits';
import { msgExtra } from './msgExtra';
import { translateLanguage } from './translateLanguage';

/** 不能转发的消息类型（与服务端一致） */
const UNFORWARDABLE = new Set(['tag', 'top', 'todo', 'notice', 'word-chain', 'vote', 'template']);

export const forwardable = (msg: Msg) => !UNFORWARDABLE.has(msg.type);

/** 可复制的纯文字：文字消息的正文、语音的转写 */
export function plainText(msg: Msg, body: MsgBody): string {
  if (body.kind === 'record') return body.text;
  if (msg.type !== 'text') return '';
  const data = (msg.msg ?? {}) as { text?: unknown; type?: unknown };
  const text = typeof data.text === 'string' ? data.text : '';
  return data.type === 'md' ? text : htmlToText(text);
}

/** 菜单里要聊天页接手的操作（打开输入栏模式、弹层、多选） */
export interface MenuHandlers {
  onReply: (msg: Msg) => void;
  onEdit: (msg: Msg) => void;
  onForward: (msg: Msg) => void;
  onSelectMany: (msg: Msg) => void;
  onSelectText: (text: string) => void;
  onSetTodo: (msg: Msg) => void;
  onTodoDetail: (msg: Msg) => void;
  onFavoriteRemark: (msgId: number) => void;
}

/**
 * 消息的长按 / 右键菜单，分三组：① 回复、转发、复制等最常用的；② 处理这条消息（编辑、撤回、置顶、标注、待办、收藏）；
 * ③ 理解这条消息（翻译、转文字）。发送失败的消息：重新发送、删除
 */
export function useMessageMenus(handlers: MenuHandlers) {
  const t = useT();
  const messenger = useMessenger();
  const actions = useMsgActions();
  const errorText = useErrorText();

  return useMemo(() => {
    const failed = (err: unknown) => showToast(errorText(err));
    const copy = (text: string) => {
      Clipboard.setStringAsync(text)
        .then(() => showToast(t('messenger:chat.copied')))
        .catch(() => {});
    };

    // 打开菜单时才调用：置顶、收藏、译文按当时的状态
    const menu = (msg: Msg, body: MsgBody, own: boolean): MenuEntry[] => {
      if (!messenger || !actions) return [];
      const state = messenger.store.getState();
      const favorited = !!state.favorites[msg.id];
      const text = plainText(msg, body);
      const { tag, todo } = msgExtra(msg);

      const main: MenuAction[] = [{ label: t('messenger:chat.reply'), icon: Reply, onSelect: () => handlers.onReply(msg) }];
      if (menuTraits.reactSubmenu) {
        main.push({
          label: t('messenger:chat.react'),
          icon: SmilePlus,
          children: REACTIONS.map((symbol) => ({ label: symbol, onSelect: () => void messenger.toggleEmoji(msg, symbol).catch(failed) })),
        });
      }
      if (forwardable(msg)) main.push({ label: t('messenger:action.forward'), icon: Forward, onSelect: () => handlers.onForward(msg) });
      if (text) {
        main.push({ label: t('messenger:chat.copy'), icon: Copy, onSelect: () => copy(text) });
        if (menuTraits.selectTextPage) main.push({ label: t('messenger:action.selectText'), icon: TextSelect, onSelect: () => handlers.onSelectText(text) });
      }
      if (forwardable(msg)) main.push({ label: t('messenger:action.selectMany'), icon: ListChecks, onSelect: () => handlers.onSelectMany(msg) });

      const manage: MenuAction[] = [];
      if (own && msg.type === 'text') manage.push({ label: t('messenger:chat.edit'), icon: Pencil, onSelect: () => handlers.onEdit(msg) });
      if (own) {
        manage.push({
          label: t('messenger:chat.withdraw'),
          icon: Undo2,
          destructive: true,
          onSelect: () =>
            confirmOnApp({
              title: t('messenger:chat.withdrawConfirm'),
              confirmLabel: t('messenger:chat.withdraw'),
              cancelLabel: t('messenger:chat.cancel'),
              destructive: true,
              onConfirm: () => void messenger.withdraw(msg).catch(failed),
            }),
        });
      }
      const topped = (state.dialogs[msg.dialog_id]?.top_msg_id ?? 0) === msg.id;
      manage.push(
        {
          label: t(topped ? 'messenger:action.unpin' : 'messenger:action.pin'),
          icon: topped ? PinOff : Pin,
          onSelect: () => void actions.toggleTop(msg).catch(failed),
        },
        {
          label: t(tag ? 'messenger:action.untag' : 'messenger:action.tag'),
          icon: tag ? FlagOff : Flag,
          onSelect: () => void actions.toggleTag(msg).catch(failed),
        },
      );
      if (todo) {
        manage.push(
          { label: t('messenger:action.todoDetail'), icon: ListChecks, onSelect: () => handlers.onTodoDetail(msg) },
          {
            label: t('messenger:action.todoCancel'),
            icon: ListX,
            onSelect: () =>
              confirmOnApp({
                title: t('messenger:action.todoCancelConfirm'),
                confirmLabel: t('confirm'),
                cancelLabel: t('messenger:chat.cancel'),
                destructive: true,
                onConfirm: () => void actions.setTodo({ msg_id: msg.id, type: 'user', userids: [] }).then(showToast).catch(failed),
              }),
          },
        );
      } else {
        manage.push({ label: t('messenger:action.todoSet'), icon: ListTodo, onSelect: () => handlers.onSetTodo(msg) });
      }
      manage.push({
        label: t(favorited ? 'messenger:action.unfavorite' : 'messenger:action.favorite'),
        icon: favorited ? StarOff : Star,
        onSelect: () =>
          void actions
            .toggleFavorite(msg.id)
            // 同旧前端：收藏后的提示里可以接着改备注
            .then((res) => showToast(res.msg, res.favorited ? { label: t('messenger:action.editRemark'), onPress: () => handlers.onFavoriteRemark(msg.id) } : undefined))
            .catch(failed),
      });

      const extra: MenuAction[] = [];
      if (text) {
        extra.push(
          state.translations[msg.id]
            ? { label: t('messenger:action.hideTranslation'), icon: Languages, onSelect: () => actions.hideTranslation(msg.id) }
            : { label: t('messenger:action.translate'), icon: Languages, onSelect: () => void actions.translate(msg, translateLanguage.get()).catch(failed) },
        );
      }
      if (body.kind === 'record' && !body.text) {
        extra.push({ label: t('messenger:action.voice2text'), icon: Captions, onSelect: () => void actions.voice2text(msg).catch(failed) });
      }

      return [main, manage, extra].filter((group) => group.length > 0).flatMap((group, index) => (index > 0 ? ['separator' as const, ...group] : group));
    };

    const pendingMenu = (item: OutboxItem): MenuEntry[] => {
      if (!messenger || item.state !== 'failed') return [];
      return [
        { label: t('messenger:chat.resend'), icon: RotateCw, onSelect: () => messenger.retrySend(item.localId) },
        { label: t('messenger:chat.delete'), icon: Trash2, destructive: true, onSelect: () => messenger.discardSend(item.localId) },
      ];
    };

    return { menu, pendingMenu };
  }, [t, messenger, actions, errorText, handlers]);
}
