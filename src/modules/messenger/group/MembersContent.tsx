import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import type { Member } from '../../../sync/api/group';
import { Icon } from '../../../ui/Icon';
import { ListItem } from '../../../ui/List';
import { Sheet } from '../../../ui/layout';
import { MemberSearch } from './MemberSearch';
import { showToast } from '../../../ui/Toast';
import { Touchable } from '../../../ui/Touchable';
import { openDialogRoute } from '../DialogList';
import { confirmGroup } from './confirm';
import { GroupForms } from './GroupForms';
import { MemberRow } from './MemberRow';
import { canRemove, memberList } from './rules';
import { useGroupManage, useGroupMembers } from './useGroup';
import { openProfile } from '../user/navigation';

const memberKey = (m: Member) => String(m.userid);

export function MembersContent({ dialogId, transfer = false }: { dialogId: number; transfer?: boolean }) {
  const t = useT();
  const { theme } = useUnistyles();
  const { d, me, can, group, messenger, failed } = useGroupManage(dialogId);
  const { members, load } = useGroupMembers(dialogId);
  const [key, setKey] = useState('');
  const [adding, setAdding] = useState(false);
  const [acting, setActing] = useState<number | null>(null);
  const list = useMemo(() => memberList(members ?? [], d, key).filter((m) => !transfer || (m.userid !== d?.owner_id && !m.bot)), [members, d, key, transfer]);
  const changed = () => void load().catch(failed);
  const actionRef = useRef<(id: number, action: 'remove' | 'deputy') => void>(() => {});
  const openRef = useRef<(id: number) => void>(() => {});
  useLayoutEffect(() => {
    actionRef.current = (id, action) => {
      if (!d || !group) return;
      const member = members?.find((m) => m.userid === id);
      if (!member) return;
      const deputy = d.deputy_ids?.includes(id) ?? false;
      if (action === 'remove' ? !canRemove(d, me, id) : !can.owner || id === me || !!member.bot) return;
      confirmGroup({
        title: action === 'remove' ? t('messenger:group.info.notice') : t(deputy ? 'messenger:group.members.removeDeputy' : 'messenger:group.members.appoint'),
        message: action === 'remove' ? t('messenger:group.members.removeConfirm', { name: member.nickname ?? '' }) : deputy ? t('messenger:group.members.removeDeputyConfirm') : t('messenger:group.members.appointConfirm', { name: member.nickname ?? '' }),
        okLabel: t('confirm'), cancelLabel: t('cancel'), tone: action === 'remove' ? 'danger' : deputy ? 'warning' : undefined, centered: true,
        onOk: () => void (action === 'remove' ? group.removeMember(dialogId, id) : group.setDeputy(dialogId, id, !deputy)).then((msg) => { showToast(msg); changed(); }).catch(failed),
      });
    };
    openRef.current = (id) => {
      if (!transfer) { setActing(id); return; }
      if (!can.transfer || !group) return;
      const member = members?.find((m) => m.userid === id);
      confirmGroup({ title: t('messenger:group.members.transferTitle'), message: member?.nickname ?? '', okLabel: t('messenger:group.members.transferConfirm'), cancelLabel: t('cancel'), onOk: () => void group.transfer(dialogId, id).then((msg) => { showToast(msg); router.back(); }).catch(failed) });
    };
  });
  const onAction = useCallback((id: number, action: 'remove' | 'deputy') => actionRef.current(id, action), []);
  const onOpen = useCallback((id: number) => openRef.current(id), []);
  const renderItem = useCallback(({ item }: { item: Member }) => <MemberRow userid={item.userid} name={item.nickname ?? ''} uri={item.userimg} bot={!!item.bot} online={!!item.online} role={item.userid === d?.owner_id ? 'owner' : d?.deputy_ids?.includes(item.userid) ? 'deputy' : ''} removable={!!d && canRemove(d, me, item.userid)} appointable={can.owner && item.userid !== me && !item.bot} onAction={onAction} onOpen={onOpen} onProfile={transfer ? onOpen : openProfile} />, [d, me, can.owner, onAction, onOpen, transfer]);
  const selected = members?.find((m) => m.userid === acting);
  const selectedDeputy = !!selected && !!d?.deputy_ids?.includes(selected.userid);
  return <View style={styles.root}>
    <View style={styles.search}><MemberSearch value={key} onChangeText={setKey} /></View>
    <FlashList data={list} renderItem={renderItem} keyExtractor={memberKey} extraData={renderItem} keyboardShouldPersistTaps="handled" />
    {can.add && !transfer && <View style={styles.footer}><Touchable testID="members-add" disabled={!members} onPress={() => setAdding(true)} style={({ hovered }) => styles.add(hovered)}><Icon icon={Plus} color={theme.colors.onPrimary} size={theme.size.iconSmall} /><Text style={styles.addText}>{t('messenger:group.members.add')}</Text></Touchable></View>}
    {adding && <GroupForms dialogId={dialogId} kind="add" members={members ?? []} onChanged={changed} onClose={() => setAdding(false)} />}
    {selected && !transfer && <Sheet visible title={selected.nickname ?? ''} onClose={() => setActing(null)}>
      <ListItem label={t('messenger:group.members.profile')} onPress={() => { setActing(null); openProfile(selected.userid); }} />
      {selected.userid !== me && <ListItem label={t('messenger:group.members.chat')} onPress={() => { setActing(null); void messenger?.openUser(selected.userid).then(openDialogRoute).catch(failed); }} />}
      {can.owner && selected.userid !== me && !selected.bot && <ListItem label={t(selectedDeputy ? 'messenger:group.members.removeDeputy' : 'messenger:group.members.appoint')} onPress={() => { setActing(null); onAction(selected.userid, 'deputy'); }} />}
      {d && canRemove(d, me, selected.userid) && <ListItem danger label={t('messenger:group.members.remove')} onPress={() => { setActing(null); onAction(selected.userid, 'remove'); }} />}
    </Sheet>}
  </View>;
}

const styles = StyleSheet.create((theme, rt) => ({
  root: { flex: 1, minHeight: 0, backgroundColor: theme.colors.surface },
  search: { marginHorizontal: rt.breakpoint === 'xs' ? theme.size.group.fieldXNarrow : theme.size.group.fieldX, marginTop: theme.size.group.fieldTop, marginBottom: theme.spacing.sm },
  // 同旧版：宽屏靠右、窄屏居中
  footer: { padding: theme.size.group.footer, alignItems: { xs: 'center', md: 'flex-end' } },
  add: (hovered: boolean) => ({ height: theme.size.group.button, paddingHorizontal: theme.size.group.buttonPad, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, borderRadius: theme.size.group.buttonRadius, backgroundColor: hovered ? theme.colors.memberAddHover : theme.colors.memberAdd }),
  addText: { ...theme.typography.groupField, color: theme.colors.onPrimary },
}));
