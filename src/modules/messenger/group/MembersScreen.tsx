import { useLocalSearchParams } from 'expo-router';

import { useT } from '../../../i18n';
import { SidePage } from '../../../ui/layout';
import { MembersContent } from './MembersContent';
import { closeGroupPage } from './useGroup';

export function MembersRoute() {
  const t = useT();
  const { dialogId, mode } = useLocalSearchParams<{ dialogId: string; mode?: string }>();
  const id = Number(dialogId);
  return <SidePage title={t(mode === 'transfer' ? 'messenger:group.info.transfer' : 'messenger:group.members.title')} testID="members-panel" onClose={() => closeGroupPage(id)}><MembersContent dialogId={id} transfer={mode === 'transfer'} /></SidePage>;
}
