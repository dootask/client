import { FileText, Image, Link2, ListTodo, type LucideIcon, MessageSquare, Tag } from 'lucide-react-native';
import { useState } from 'react';

import type { StoredDialog } from '../../../sync/messenger';
import { availableMsgTypes, type MsgFilterType } from '../../../sync/messenger/rules';
import { showToast } from '../../../ui/Toast';
import { useErrorText } from '../../session';
import { useMessenger, useMessengerState } from '../hooks';

/** 分类条上的一项：null 是「消息」（不筛选） */
export type MsgTypeFilter = MsgFilterType | null;

export const MSG_TYPE_ICONS: Record<MsgFilterType | 'msg', LucideIcon> = { msg: MessageSquare, todo: ListTodo, tag: Tag, image: Image, file: FileText, link: Link2 };
export const MSG_TYPE_LABELS = {
  msg: 'messenger:filter.msg',
  todo: 'messenger:filter.todo',
  tag: 'messenger:filter.tag',
  image: 'messenger:filter.image',
  file: 'messenger:filter.file',
  link: 'messenger:filter.link',
} as const;

/** 当前会话正在筛的分类 */
export function useMsgFilter(dialogId: number | undefined): MsgTypeFilter {
  return useMessengerState((s) => (dialogId && s.filter?.dialogId === dialogId ? s.filter.type : null));
}

/**
 * 分类条的数据（两端共用）：会话里有哪类消息才列哪类（标记来自会话数据）；正在筛的一类即使没了也保留，才能切回。
 * 「待办」带我未完成的条数。只有「消息」一项时 types 为空，分类条不显示。
 * 点了的一项先高亮（selected），不等筛选结果回来
 */
export function useMsgTypes(dialog: StoredDialog) {
  const messenger = useMessenger();
  const errorText = useErrorText();
  const filter = useMsgFilter(dialog.id);
  const todoNum = dialog.todo_num ?? 0;
  const types = availableMsgTypes(dialog, filter);
  const [selected, setSelected] = useState<MsgTypeFilter>(filter);
  const [prevFilter, setPrevFilter] = useState<MsgTypeFilter>(filter);
  if (filter !== prevFilter) {
    setPrevFilter(filter);
    setSelected(filter);
  }
  const select = (type: MsgTypeFilter) => {
    if (type === selected) return;
    setSelected(type);
    void messenger?.setFilter(dialog.id, type).catch((err) => showToast(errorText(err)));
  };
  return { types: types.length ? [null, ...types] : [], selected, select, todoNum };
}
