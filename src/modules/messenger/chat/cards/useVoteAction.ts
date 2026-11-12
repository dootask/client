import { useState } from 'react';

import { useT } from '../../../../i18n';
import type { VoteActionType } from '../../../../sync/api/dialog';
import { showToast } from '../../../../ui/Toast';
import { useErrorText } from '../../../session';
import { useMsgActions } from '../../hooks';
import { useCardMsg } from './cardMsg';

/**
 * 投票卡片的操作（同旧版）：投票、再次发送（成功提示「已发送」）、结束；进行中按钮转圈、不能再点，失败提示服务端的错误。
 * 不在聊天行里（没有所在消息）时 run 为空
 */
export function useVoteAction() {
  const t = useT();
  const msg = useCardMsg();
  const actions = useMsgActions();
  const errorText = useErrorText();
  const [busy, setBusy] = useState(false);
  const run = msg && actions
    ? (type: VoteActionType, picked?: string[]) => {
        setBusy(true);
        actions
          .vote(msg, type, picked)
          .then(() => type === 'again' && showToast(t('messenger:card.sent')))
          .catch((err) => showToast(errorText(err)))
          .finally(() => setBusy(false));
      }
    : undefined;
  return { busy, run };
}
