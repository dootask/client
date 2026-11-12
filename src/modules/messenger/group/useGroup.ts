import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useT } from '../../../i18n';
import type { Member } from '../../../sync/api/group';
import { showToast } from '../../../ui/Toast';
import { useErrorText, useSession } from '../../session';
import { useDialog, useGroupActions, useMessenger } from '../hooks';
import { confirmGroup } from './confirm';
import { groupPermissions } from './rules';

export function closeGroupPage(dialogId: number) {
  if (router.canGoBack()) router.back();
  else router.navigate(`/messenger/${dialogId}`);
}

export function useGroupManage(dialogId: number) {
  const t = useT();
  const d = useDialog(dialogId);
  const me = useSession((s) => s.user?.userid ?? 0);
  const admin = useSession((s) => s.user?.identity.includes('admin') ?? false);
  const group = useGroupActions();
  const messenger = useMessenger();
  const errorText = useErrorText();
  const failed = useCallback((error: unknown) => showToast(errorText(error)), [errorText]);
  const missing = !d;
  useFocusEffect(useCallback(() => {
    if (dialogId > 0 && missing) void messenger?.fetchDialog(dialogId).catch(failed);
  }, [messenger, dialogId, missing, failed]));
  const leave = (disband: boolean) => {
    if (!group) return;
    confirmGroup({
      title: t('messenger:group.info.notice'),
      message: disband ? t('messenger:group.info.disbandConfirm', { name: d?.name ?? '' }) : t('messenger:group.info.exitConfirm'),
      okLabel: disband ? t('messenger:group.info.disbandAction') : t('confirm'),
      cancelLabel: t('cancel'),
      tone: 'danger', centered: true,
      onOk: () => void (disband ? group.disband(dialogId) : group.exit(dialogId)).then((msg) => {
        showToast(msg);
        router.dismissTo('/messenger');
      }).catch(failed),
    });
  };
  return { d, me, admin, group, messenger, can: groupPermissions(d, me, admin), failed, leave };
}

export function useGroupMembers(dialogId: number) {
  const group = useGroupActions();
  const errorText = useErrorText();
  const [members, setMembers] = useState<Member[] | null>(null);
  const load = useCallback(async () => {
    if (!group || dialogId <= 0) return;
    const list = await group.members(dialogId);
    setMembers(list);
  }, [group, dialogId]);
  useFocusEffect(useCallback(() => {
    if (dialogId <= 0) return;
    let stale = false;
    void group?.members(dialogId).then((list) => !stale && setMembers(list)).catch((error: unknown) => !stale && showToast(errorText(error)));
    return () => { stale = true; };
  }, [group, dialogId, errorText]));
  return { members, load };
}
