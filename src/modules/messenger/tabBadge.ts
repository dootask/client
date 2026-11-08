import { useMemo } from 'react';

import { useT } from '../../i18n';
import { badgeText, unreadTotals } from '../../sync/messenger';
import { useMessengerState } from './hooks';

/** 「消息」Tab 上的红点文字（R8），没有未读为空串 */
export function useTabBadge(): string {
  const t = useT();
  const dialogs = useMessengerState((s) => s.dialogs);
  const totals = useMemo(() => unreadTotals(Object.values(dialogs)), [dialogs]);
  return badgeText(totals, t('messenger:todo'));
}
