import { ListOrdered, type LucideIcon, Phone, Sparkles, VenetianMask, Vote } from 'lucide-react-native';
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
export function useExtras({ dialog, userId, openSheet, aiEnabled, openAi }: { dialog: StoredDialog | undefined; userId: number; openSheet: (sheet: ExtraSheet) => void; aiEnabled: boolean; openAi: () => void }): Extra[] {
  const t = useT();
  const callPeer = useCallPeer(dialog, userId);
  return useMemo(() => {
    if (!dialog) return [];
    const ai: Extra[] = aiEnabled ? [{ key: 'ai', icon: Sparkles, label: t('messenger:ai.generate'), onPress: openAi }] : [];
    if (dialog.type === 'group') {
      return [
        { key: 'vote', icon: Vote, label: t('messenger:vote.title'), onPress: () => openSheet({ kind: 'vote' }) },
        { key: 'wordChain', icon: ListOrdered, label: t('messenger:wordChain.title'), onPress: () => openSheet({ kind: 'wordChain' }) },
        ...ai,
      ];
    }
    const peer = dialog.dialog_user?.userid ?? 0;
    if (dialog.type !== 'user' || dialog.bot || !peer || peer === userId) return ai;
    // 顺序同旧版：打电话在匿名消息前面
    const anon: Extra = { key: 'anon', icon: VenetianMask, label: t('messenger:anon.entry'), onPress: () => openSheet({ kind: 'anon', userid: peer }) };
    return [...(callPeer ? [{ key: 'call', icon: Phone, label: t('messenger:call.entry'), onPress: callPeer }, anon] : [anon]), ...ai];
  }, [dialog, userId, callPeer, openSheet, aiEnabled, openAi, t]);
}

/**
 * 给单聊真人打电话（手机上才有）：先确认，取到号码后交给系统拨号，服务端会在会话里留一条通知。
 * 不能打时返回 null。加号面板和 App 导航栏的电话按钮共用
 */
export function useCallPeer(dialog: StoredDialog | undefined, userId: number): (() => void) | null {
  const t = useT();
  const actions = useMsgActions();
  const errorText = useErrorText();
  const peer = dialog?.type === 'user' && !dialog.bot ? (dialog.dialog_user?.userid ?? 0) : 0;
  const dialogId = dialog?.id ?? 0;
  const name = dialog?.name;
  return useMemo(() => {
    if (!CAN_DIAL || !peer || peer === userId || !actions) return null;
    const call = () => {
      actions
        .tel(dialogId)
        .then((tel) => Linking.openURL(`tel:${tel}`))
        .catch((err) => showToast(errorText(err)));
    };
    return () => confirmOnApp({ title: t('messenger:call.confirm', { name }), confirmLabel: t('messenger:call.action'), cancelLabel: t('cancel'), onConfirm: call });
  }, [peer, userId, actions, dialogId, name, errorText, t]);
}
