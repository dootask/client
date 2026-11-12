import { Plus } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import type { Member } from '../../../sync/api/group';
import { DialogAvatar, UserAvatar } from '../../../ui/Avatar';
import { Icon } from '../../../ui/Icon';
import { showToast } from '../../../ui/Toast';
import { Touchable } from '../../../ui/Touchable';
import { DialogPicker } from '../picker/DialogPicker';
import { isGroup, type PickUser } from '../picker/pickerData';
import { GroupFormShell } from './GroupFormShell';
import { pickAvatar } from './pickImages';
import { useGroupManage } from './useGroup';

export type GroupFormKind = 'edit' | 'add' | 'transfer';

export function GroupForms({ dialogId, kind, members, onClose, onChanged }: { dialogId: number; kind: GroupFormKind; members: readonly Member[]; onClose: () => void; onChanged?: () => void }) {
  const t = useT();
  const { theme, rt } = useUnistyles();
  const { d, me, group, can, admin, failed } = useGroupManage(dialogId);
  const [name, setName] = useState(d?.name ?? '');
  const [image64, setImage] = useState<string | null>(null);
  const [selected, setSelected] = useState<PickUser[]>([]);
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const active = useRef(true);
  const working = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);
  const chooseAvatar = async () => {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    try {
      const image = await pickAvatar();
      if (active.current && image) setImage(image);
    } catch (error) {
      if (active.current) failed(error);
    } finally {
      working.current = false;
      if (active.current) setBusy(false);
    }
  };
  if (!d || !group) return null;
  const title = kind === 'edit' ? t('messenger:group.info.edit') : kind === 'add' ? t('messenger:group.members.addTitle') : t('messenger:group.members.transferTitle');
  const confirmLabel = kind === 'edit' ? t('save') : kind === 'add' ? t('messenger:group.members.addConfirm') : t('messenger:group.members.transferConfirm');
  const save = async () => {
    if (working.current || (kind === 'edit' ? !can.edit || (can.rename && !name.trim()) : kind === 'add' ? !can.add || selected.length === 0 : !can.transfer || selected.length !== 1)) return;
    working.current = true;
    setBusy(true);
    try {
      const msg = kind === 'edit'
        ? await group.edit(dialogId, { ...(can.rename ? { name } : {}), ...(image64 ? { image64 } : {}) }, d.group_type === 'all' && admin)
        : kind === 'add' ? await group.addMembers(dialogId, selected.map((user) => user.userid)) : await group.transfer(dialogId, selected[0]!.userid);
      if (!active.current) return;
      showToast(msg);
      onChanged?.();
      onClose();
    } catch (error) {
      if (active.current) failed(error);
    } finally {
      working.current = false;
      if (active.current) setBusy(false);
    }
  };
  const disabled = kind === 'edit' ? can.rename && !name.trim() : selected.length === 0;
  const disabledIds = kind === 'add' ? members.map((m) => m.userid) : [me];
  const note = d.group_type === 'department' ? t('messenger:group.members.departmentHint') : d.group_type === 'project' ? t('messenger:group.members.projectHint') : d.group_type === 'task' ? t('messenger:group.members.taskHint') : '';
  return <>
    <GroupFormShell width={rt.breakpoint === 'xs' ? kind === 'edit' ? theme.size.group.editModalNarrow : theme.size.group.modalNarrow : theme.size.group.modal} title={title} confirmLabel={confirmLabel} busy={busy} disabled={disabled} testID={`group-form-${kind}`} onSave={() => void save()} onClose={() => !busy && onClose()}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
        {kind === 'edit' ? <>
          <View style={styles.formRow}>
            <Text style={[styles.label, styles.formLabel]}>{t('messenger:group.info.avatar')}</Text>
            <Touchable disabled={busy} onPress={() => void chooseAvatar()} style={styles.avatar} accessibilityLabel={t('messenger:group.info.changeAvatar')}>
              <DialogAvatar uri={image64 ?? d.avatar} groupType={d.group_type} size={theme.size.avatar.xxl} />
              <Text style={styles.label}>{t('messenger:group.info.changeAvatar')}</Text>
            </Touchable>
          </View>
          <View style={styles.formRow}>
            <Text style={[styles.label, styles.formLabel]}>{t('messenger:group.info.name')}</Text>
            <TextInput value={name} onChangeText={setName} editable={can.rename && !busy} maxLength={theme.size.group.editMax} style={[styles.input, styles.nameInput, !can.rename && styles.disabled]} placeholderTextColor={theme.colors.placeholder} />
          </View>
          {!can.rename && <Text style={styles.hint}>{t('messenger:group.info.nameLocked')}</Text>}
        </> : <>
          <Text style={styles.label}>{kind === 'add' ? t('messenger:group.members.newMembers') : t('messenger:group.members.newOwner')}</Text>
          {kind === 'transfer' ? <Touchable disabled={busy} onPress={() => setPicking(true)} style={[styles.input, styles.ownerSelect]} accessibilityLabel={t('messenger:group.members.select')}><Text style={styles.label} numberOfLines={1}>{selected[0]?.nickname ?? ''}</Text></Touchable> : <View style={styles.selected}>
            {selected.map((user) => <Touchable key={user.userid} disabled={busy} onPress={() => setSelected((list) => list.filter((one) => one.userid !== user.userid))} style={styles.chip} accessibilityLabel={t('messenger:group.members.removeSelected', { name: user.nickname })}>
              <UserAvatar userid={user.userid} name={user.nickname} uri={user.userimg} bot={user.bot} size={theme.size.avatar.pickChip} />
              <Text style={styles.label} numberOfLines={1}>{user.nickname}</Text>
            </Touchable>)}
            <Touchable disabled={busy} onPress={() => setPicking(true)} style={styles.plus} accessibilityLabel={t('messenger:group.members.select')}><Icon icon={Plus} size={theme.size.iconSmall} color={theme.colors.regularText} /></Touchable>
          </View>}
          {kind === 'add' && !!note && <Text style={styles.hint}>{note}</Text>}
        </>}
      </ScrollView>
    </GroupFormShell>
    {picking && <DialogPicker visible membersOnly initial={selected} disabledIds={disabledIds} title={t('messenger:group.members.select')} max={kind === 'transfer' ? 1 : 100} onClose={() => setPicking(false)} onSubmit={(picked) => { setSelected(picked.filter((item): item is PickUser => !isGroup(item))); setPicking(false); }} />}
  </>;
}

const styles = StyleSheet.create((theme, rt) => ({
  body: { gap: theme.size.group.formGap, paddingBottom: theme.spacing.md },
  formRow: { flexDirection: rt.breakpoint === 'xs' ? 'column' : 'row', alignItems: rt.breakpoint === 'xs' ? 'flex-start' : 'center', gap: rt.breakpoint === 'xs' ? theme.spacing.sm : 0 },
  formLabel: { width: rt.breakpoint === 'xs' ? undefined : theme.size.group.formLabel },
  nameInput: { flex: rt.breakpoint === 'xs' ? undefined : 1, width: rt.breakpoint === 'xs' ? '100%' : undefined },
  ownerSelect: { width: theme.size.group.ownerSelect, maxWidth: '100%', justifyContent: 'center' },
  label: { ...theme.typography.groupField, color: theme.colors.regularText },
  input: { height: theme.size.group.formInput, borderWidth: 1, borderColor: theme.colors.headerLine, borderRadius: theme.size.group.formRadius, paddingHorizontal: theme.size.group.searchPad, ...theme.typography.groupField, color: theme.colors.regularText },
  disabled: { opacity: theme.opacity.disabled },
  hint: { ...theme.typography.caption, color: theme.colors.descText },
  avatar: { flexDirection: 'row', alignItems: 'center', gap: theme.size.group.formGap },
  selected: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.spacing.sm, minHeight: theme.size.group.formInput },
  chip: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, maxWidth: '100%' },
  plus: { width: theme.size.avatar.pickChip, height: theme.size.avatar.pickChip, borderRadius: theme.radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.bg },
}));
