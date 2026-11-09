import { ListOrdered, type LucideIcon, Phone, VenetianMask, Vote } from 'lucide-react-native';
import { useMemo } from 'react';
import { Linking } from 'react-native';

import { useT } from '../../../i18n';
import { CAN_DIAL } from '../../../platform';
import type { StoredDialog } from '../../../sync/messenger';
import { confirmOnApp } from '../../../ui/popover';
import { showToast } from '../../../ui/Toast';
import { useErrorText } from '../../session';
import { useMsgActions } from '../hooks';

/** 加号里打开的弹层 */
export type ExtraSheet = { kind: 'vote' | 'wordChain' } | { kind: 'anon'; userid: number };

/** 加号里除发图片、文件外的入口 */
export interface Extra {
  key: string;
  icon: LucideIcon;
  label: string;
  onPress: () => void;
}

/**
 * 按会话类型给出的入口：群聊有投票、接龙；和真人单聊有匿名消息，手机上还能打电话（先确认，服务端会在会话里留一条通知）
 */
export function useExtras({ dialog, userId, openSheet }: { dialog: StoredDialog | undefined; userId: number; openSheet: (sheet: ExtraSheet) => void }): Extra[] {
  const t = useT();
  const actions = useMsgActions();
  const errorText = useErrorText();
  return useMemo(() => {
    if (!dialog) return [];
    if (dialog.type === 'group') {
      return [
        { key: 'vote', icon: Vote, label: t('messenger:vote.title'), onPress: () => openSheet({ kind: 'vote' }) },
        { key: 'wordChain', icon: ListOrdered, label: t('messenger:wordChain.title'), onPress: () => openSheet({ kind: 'wordChain' }) },
      ];
    }
    const peer = dialog.dialog_user?.userid ?? 0;
    if (dialog.type !== 'user' || dialog.bot || !peer) return [];
    const list: Extra[] = [{ key: 'anon', icon: VenetianMask, label: t('messenger:anon.entry'), onPress: () => openSheet({ kind: 'anon', userid: peer }) }];
    if (CAN_DIAL && peer !== userId && actions) {
      const call = () => {
        actions
          .tel(dialog.id)
          .then((tel) => Linking.openURL(`tel:${tel}`))
          .catch((err) => showToast(errorText(err)));
      };
      list.push({
        key: 'call',
        icon: Phone,
        label: t('messenger:call.entry'),
        onPress: () => confirmOnApp({ title: t('messenger:call.confirm', { name: dialog.name }), confirmLabel: t('messenger:call.action'), cancelLabel: t('cancel'), onConfirm: call }),
      });
    }
    return list;
  }, [dialog, userId, actions, openSheet, errorText, t]);
}
