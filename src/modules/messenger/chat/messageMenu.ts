import * as Clipboard from 'expo-clipboard';
import {
  Captions, Copy, Flag, FlagOff, Forward, Languages, ListChecks, ListTodo, ListX, MessagesSquare, Pencil, Pin, PinOff, Reply, RotateCw, Star, StarOff,
  TextSelect, Trash2, Undo2, X,
} from 'lucide-react-native';
import { useLayoutEffect, useMemo, useRef } from 'react';

import { useT } from '../../../i18n';
import type { Msg } from '../../../sync/api/dialog';
import { htmlToCompose, type OutboxItem, type UploadItem } from '../../../sync/messenger';
import type { MsgBody } from '../../../sync/messenger/body';
import { confirmOnApp, type MenuAction, type MenuEntry } from '../../../ui/popover';
import { showToast } from '../../../ui/Toast';
import { useErrorText } from '../../session';
import { useMessenger, useMsgActions } from '../hooks';
import { fileMenu } from './fileActions';
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
  return data.type === 'md' ? text : htmlToCompose(text).text;
}

/** 菜单里要聊天页接手的操作（打开输入栏模式、弹层、多选）；不能发言时没有回复、编辑 */
export interface MenuHandlers {
  onReply?: (msg: Msg) => void;
  onEdit?: (msg: Msg) => void;
  onForward: (msg: Msg) => void;
  onSelectMany: (msg: Msg) => void;
  onSelectText: (text: string) => void;
  onSetTodo: (msg: Msg) => void;
  onTodoDetail: (msg: Msg) => void;
  onFavoriteRemark: (msgId: number) => void;
  /** 筛选分类时才有：回到完整对话看这条的上下文 */
  onFullChat?: (msg: Msg) => void;
}

/** 消息菜单的各项，排列和分组按平台（menuTraits.layout） */
export type MenuKey =
  | 'fullChat' | 'reply' | 'forward' | 'copy' | 'selectText' | 'selectMany' | 'edit' | 'withdraw' | 'pin' | 'tag'
  | 'todoDetail' | 'todoCancel' | 'todoSet' | 'favorite' | 'translate' | 'voice2text'
  | 'save' | 'share' | 'download' | 'downloadImage';

/**
 * 消息的长按 / 右键菜单：可用的项按 menuTraits.layout 排列（App 分三组，Web 照旧版一组平铺）。
 * 发送失败的消息：重新发送、删除；发送中的文件：取消发送
 */
export function useMessageMenus(handlers: MenuHandlers) {
  const t = useT();
  const messenger = useMessenger();
  const actions = useMsgActions();
  const errorText = useErrorText();
  // 回调在选中菜单项时才用：取最新的一份，调用方每次渲染给新对象也不重建菜单（菜单变了整个消息列表都要重渲染）
  const latest = useRef(handlers);
  useLayoutEffect(() => {
    latest.current = handlers;
  });

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

      const { onReply, onEdit, onFullChat } = latest.current;
      const acts: Partial<Record<MenuKey, MenuAction>> = {};
      if (onFullChat) acts.fullChat = { label: t('messenger:filter.fullChat'), icon: MessagesSquare, onSelect: () => onFullChat(msg) };
      if (onReply) acts.reply = { label: t('messenger:chat.reply'), icon: Reply, onSelect: () => onReply(msg) };
      if (forwardable(msg)) {
        acts.forward = { label: t('messenger:action.forward'), icon: Forward, onSelect: () => latest.current.onForward(msg) };
        acts.selectMany = { label: t('messenger:action.selectMany'), icon: ListChecks, onSelect: () => latest.current.onSelectMany(msg) };
      }
      if (text) {
        acts.copy = { label: t('messenger:chat.copy'), icon: Copy, onSelect: () => copy(text) };
        const { selectText } = menuTraits;
        acts.selectText = selectText
          ? { label: t('messenger:action.selectCopy'), icon: TextSelect, onSelect: selectText }
          : { label: t('messenger:action.selectText'), icon: TextSelect, onSelect: () => latest.current.onSelectText(text) };
        acts.translate = state.translations[msg.id]
          ? { label: t('messenger:action.hideTranslation'), icon: Languages, onSelect: () => actions.hideTranslation(msg.id) }
          : { label: t('messenger:action.translate'), icon: Languages, onSelect: () => void actions.translate(msg, translateLanguage.get()).catch(failed) };
      }
      if (body.kind === 'record' && !body.text) {
        acts.voice2text = { label: t('messenger:action.voice2text'), icon: Captions, onSelect: () => void actions.voice2text(msg).catch(failed) };
      }
      if (own && msg.type === 'text' && onEdit) acts.edit = { label: t('messenger:chat.edit'), icon: Pencil, onSelect: () => onEdit(msg) };
      if (own) {
        acts.withdraw = {
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
        };
      }
      const topped = (state.dialogs[msg.dialog_id]?.top_msg_id ?? 0) === msg.id;
      acts.pin = { label: t(topped ? 'messenger:action.unpin' : 'messenger:action.pin'), icon: topped ? PinOff : Pin, onSelect: () => void actions.toggleTop(msg).catch(failed) };
      acts.tag = { label: t(tag ? 'messenger:action.untag' : 'messenger:action.tag'), icon: tag ? FlagOff : Flag, onSelect: () => void actions.toggleTag(msg).catch(failed) };
      if (todo) {
        acts.todoDetail = { label: t('messenger:action.todoDetail'), icon: ListChecks, onSelect: () => latest.current.onTodoDetail(msg) };
        acts.todoCancel = {
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
        };
      } else {
        acts.todoSet = { label: t('messenger:action.todoSet'), icon: ListTodo, onSelect: () => latest.current.onSetTodo(msg) };
      }
      acts.favorite = {
        label: t(favorited ? 'messenger:action.unfavorite' : 'messenger:action.favorite'),
        icon: favorited ? StarOff : Star,
        onSelect: () =>
          void actions
            .toggleFavorite(msg.id)
            // 同旧前端：收藏后的提示里可以接着改备注
            .then((res) => showToast(res.msg, res.favorited ? { label: t('messenger:action.editRemark'), onPress: () => latest.current.onFavoriteRemark(msg.id) } : undefined))
            .catch(failed),
      };
      Object.assign(acts, fileMenu(msg, body, t));

      // 按平台的排列取出：组之间放分隔线，空组不要
      return menuTraits.layout
        .map((group) => group.flatMap((key) => acts[key] ?? []))
        .filter((group) => group.length > 0)
        .flatMap((group, index) => (index > 0 ? ['separator' as const, ...group] : group));
    };

    const pendingMenu = (item: OutboxItem): MenuEntry[] => {
      if (!messenger || item.state !== 'failed') return [];
      return [
        { label: t('messenger:chat.resend'), icon: RotateCw, onSelect: () => messenger.retrySend(item.localId) },
        { label: t('messenger:chat.delete'), icon: Trash2, destructive: true, onSelect: () => messenger.discardSend(item.localId) },
      ];
    };

    // 发送中的文件：取消发送；失败的：重新发送、删除
    const uploadMenu = (item: UploadItem): MenuEntry[] => {
      if (!messenger) return [];
      if (item.state === 'sending') {
        return [{ label: t('messenger:chat.cancelSend'), icon: X, destructive: true, onSelect: () => messenger.discardUpload(item.localId) }];
      }
      return [
        { label: t('messenger:chat.resend'), icon: RotateCw, onSelect: () => messenger.retryUpload(item.localId) },
        { label: t('messenger:chat.delete'), icon: Trash2, destructive: true, onSelect: () => messenger.discardUpload(item.localId) },
      ];
    };

    return { menu, pendingMenu, uploadMenu };
  }, [t, messenger, actions, errorText]);
}
