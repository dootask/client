import { router } from 'expo-router';
import { Ellipsis } from 'lucide-react-native';
import { useState } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import type { StoredDialog } from '../../../sync/messenger';
import { Icon } from '../../../ui/Icon';
import { Menu } from '../../../ui/popover';
import { openMedia } from '../../media';
import { GroupForms, type GroupFormKind } from './GroupForms';
import { headerCommands, type HeaderCommand } from './rules';
import { useGroupManage } from './useGroup';
import { openProfile } from '../user/navigation';

const LABELS = {
  search: 'messenger:group.info.search', info: 'messenger:group.info.title', detail: 'messenger:group.info.detail',
  edit: 'messenger:group.info.edit', editBot: 'messenger:group.info.edit', prompt: 'messenger:group.info.prompt',
  avatar: 'messenger:group.info.viewAvatar', create: 'messenger:group.create.title', transfer: 'messenger:group.info.transfer',
  report: 'messenger:group.info.report', exit: 'messenger:group.info.exit', disband: 'messenger:group.info.disband',
} as const;

export function openChatInfo(dialog: StoredDialog) {
  if (dialog.type === 'user') openProfile(dialog.dialog_user?.userid ?? 0);
  else router.push({ pathname: '/messenger/info/[dialogId]', params: { dialogId: dialog.id } });
}

export function ChatMenu({ dialog, style }: { dialog: StoredDialog | undefined; style: StyleProp<ViewStyle> }) {
  const t = useT();
  const { theme } = useUnistyles();
  const { me, admin, leave } = useGroupManage(dialog?.id ?? 0);
  const [form, setForm] = useState<GroupFormKind | null>(null);
  const command = (key: HeaderCommand) => {
    if (!dialog) return;
    const dialogId = dialog.id;
    switch (key) {
      case 'info': case 'detail': openChatInfo(dialog); break;
      case 'search': router.push({ pathname: '/messenger/search/[dialogId]', params: { dialogId } }); break;
      case 'report': router.push({ pathname: '/messenger/report/[dialogId]', params: { dialogId } }); break;
      case 'editBot': case 'prompt': router.push({ pathname: '/messenger/bot/[dialogId]', params: { dialogId, mode: key } }); break;
      case 'create': router.push({ pathname: '/group/create', params: { userids: dialog.dialog_user?.userid === me ? '' : String(dialog.dialog_user?.userid ?? '') } }); break;
      case 'edit': setForm('edit'); break;
      case 'transfer': setForm('transfer'); break;
      case 'avatar': if (dialog.avatar) openMedia({ kind: 'pictures', items: [{ url: dialog.avatar }], position: 0 }); break;
      case 'exit': leave(false); break;
      case 'disband': leave(true); break;
    }
  };
  return <>
    <Menu button style={style} look="dialog" minWidth={theme.size.group.menu} placement={{ side: 'bottom', align: 'end' }} accessibilityLabel={t('messenger:group.info.menu')} items={() => dialog ? headerCommands(dialog, me, admin).map((key) => ({ label: t(LABELS[key]), destructive: key === 'exit' || key === 'disband', onSelect: () => command(key) })) : []}>
      <Icon icon={Ellipsis} color={theme.colors.regularText} size={theme.size.icon} />
    </Menu>
    {form && dialog && <GroupForms dialogId={dialog.id} kind={form} members={[]} onClose={() => setForm(null)} />}
  </>;
}
