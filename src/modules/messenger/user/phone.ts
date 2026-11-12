import { useCallback, useEffect, useRef, useState } from 'react';

import { useT } from '../../../i18n';
import { showToast } from '../../../ui/Toast';
import { useErrorText, useSession } from '../../session';
import { confirmGroup } from '../group/confirm';
import { useMessenger, useMsgActions, useUser } from '../hooks';

export function usePhone(userid: number, present: (tel: string) => Promise<void>) {
  const t = useT();
  const messenger = useMessenger();
  const actions = useMsgActions();
  const errorText = useErrorText();
  const user = useUser(userid);
  const ownTel = useSession((s) => s.user?.userid === userid ? s.user.tel : null);
  const [tel, setTel] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  const working = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);
  const open = useCallback(() => {
    if (!actions || !messenger || working.current) return;
    // dialog/tel 会通知对方，不能在资料加载时自动请求。
    confirmGroup({
      title: t('messenger:group.info.notice'), message: t('messenger:group.info.phoneConfirm', { name: user?.nickname ?? '' }),
      cancelLabel: t('cancel'), okLabel: t('confirm'),
      onOk: () => {
        if (working.current) return;
        // 自己的号码本地就有；dialog/tel 只查会话里的另一方，查自己会报「会话对象不存在」
        if (ownTel) {
          void present(ownTel).catch((error: unknown) => showToast(errorText(error)));
          return;
        }
        working.current = true;
        setBusy(true);
        void messenger.openUser(userid).then((id) => actions.tel(id)).then(async (value) => {
          if (!alive.current) return;
          setTel(value);
          await present(value);
        }).catch((error: unknown) => { if (alive.current) showToast(errorText(error)); }).finally(() => {
          working.current = false;
          if (alive.current) setBusy(false);
        });
      },
    });
  }, [actions, messenger, t, user?.nickname, userid, ownTel, present, errorText]);
  return { tel: tel ?? ownTel ?? '-', busy, open };
}
