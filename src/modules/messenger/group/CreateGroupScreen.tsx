import { FlashList } from '@shopify/flash-list';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Camera, Plus, X } from 'lucide-react-native';
import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import { DialogAvatar, UserAvatar } from '../../../ui/Avatar';
import { Icon } from '../../../ui/Icon';
import { Sheet } from '../../../ui/layout';
import { TextField } from '../../../ui/TextField';
import { Touchable } from '../../../ui/Touchable';
import { DialogPicker } from '../picker/DialogPicker';
import type { PickUser } from '../picker/pickerData';
import { closeCreateGroupRoute, CREATE_GROUP_MODAL_OPTIONS, type CreateGroupParams, type CreateGroupResult, MAX_CREATE_MEMBERS, openCreatedGroup, useCreateGroup } from './create';

export function CreateGroupRoute() {
  const params = useLocalSearchParams<CreateGroupParams>();
  return <CreateGroupScreen key={String(params.userids ?? '')} userids={params.userids} />;
}

/** App 照旧版创建 sheet：头像和选填名称一行，下面横向成员串；关闭动画结束后再打开新群。 */
export function CreateGroupScreen(params: CreateGroupParams) {
  const t = useT();
  const { theme } = useUnistyles();
  const [visible, setVisible] = useState(true);
  const created = useRef<CreateGroupResult | null>(null);
  const onCreated = useCallback((result: CreateGroupResult) => {
    created.current = result;
    setVisible(false);
  }, []);
  const form = useCreateGroup(params, onCreated);
  const canClose = form.canClose;
  const close = useCallback(() => {
    if (canClose()) setVisible(false);
  }, [canClose]);
  const hidden = useCallback(() => {
    if (created.current) openCreatedGroup(created.current);
    else closeCreateGroupRoute();
  }, []);
  const confirm = useMemo(() => ({ label: t('messenger:group.create.submit'), onPress: form.create, busy: form.creating, disabled: !form.canCreate }), [t, form.create, form.creating, form.canCreate]);
  const locked = form.creating || form.avatarPicking;

  return (
    <>
      <Stack.Screen options={CREATE_GROUP_MODAL_OPTIONS} />
      <Sheet visible={visible} onClose={close} onHidden={hidden} title={t('messenger:group.create.title')} confirm={confirm}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.head}>
            <Touchable accessibilityRole="button" accessibilityLabel={t('messenger:group.create.changeAvatar')} disabled={locked} onPress={form.changeAvatar} style={({ pressed }) => styles.avatarButton(pressed)}>
              {form.image64 ? (
                <DialogAvatar uri={form.image64} size={theme.size.groupCreate.avatarNative} />
              ) : (
                <View style={styles.emptyAvatar}>
                  <Icon icon={Camera} color={theme.colors.text3} size={theme.size.groupCreate.cameraIcon} />
                </View>
              )}
              {form.avatarPicking && <View style={styles.avatarBusy}><ActivityIndicator color={theme.colors.primary} /></View>}
            </Touchable>
            <View style={styles.name}>
              <GroupName disabled={locked} onChange={form.onNameChange} />
            </View>
          </View>
          <NativeMembers selected={form.selected} disabled={locked} onRemove={form.remove} onAdd={form.openPicker} />
          {!!form.error && <Text accessibilityRole="alert" style={styles.error}>{form.error}</Text>}
        </ScrollView>
      </Sheet>
      {form.picking && (
        <DialogPicker
          visible
          title={t('messenger:group.create.pickMembers')}
          membersOnly
          initial={form.selected}
          disabledIds={form.disabledIds}
          max={MAX_CREATE_MEMBERS}
          onSubmit={form.confirmMembers}
          onClose={form.closePicker}
        />
      )}
    </>
  );
}

const GroupName = memo(function GroupName({ disabled, onChange }: { disabled: boolean; onChange: (value: string) => void }) {
  const t = useT();
  const [name, setName] = useState('');
  const change = useCallback((value: string) => {
    setName(value);
    onChange(value);
  }, [onChange]);
  return <TextField accessibilityLabel={t('messenger:group.create.name')} value={name} onChangeText={change} placeholder={t('messenger:group.create.nameNativePlaceholder')} returnKeyType="done" editable={!disabled} />;
});

const memberKey = (item: PickUser) => String(item.userid);

const NativeMembers = memo(function NativeMembers({ selected, disabled, onRemove, onAdd }: { selected: PickUser[]; disabled: boolean; onRemove: (userid: number) => void; onAdd: () => void }) {
  const t = useT();
  const renderItem = useCallback(({ item }: { item: PickUser }) => <Member userid={item.userid} name={item.nickname} uri={item.userimg} bot={item.bot} disabled={disabled} onRemove={onRemove} />, [disabled, onRemove]);
  const add = useMemo(() => (
    <View style={selected.length > 0 ? styles.addGap : undefined}>
      <AddMember disabled={disabled} onPress={onAdd} />
    </View>
  ), [disabled, selected.length, onAdd]);
  return (
    <View style={styles.memberSection}>
      <Text style={styles.memberLabel}>{t('messenger:group.create.membersCount', { n: selected.length + 1 })}</Text>
      <View style={styles.memberList}>
        <FlashList horizontal data={selected} keyExtractor={memberKey} renderItem={renderItem} extraData={disabled} ListFooterComponent={add} ItemSeparatorComponent={MemberGap} contentContainerStyle={styles.members} showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" />
      </View>
    </View>
  );
});

const Member = memo(function Member({ userid, name, uri, bot, disabled, onRemove }: { userid: number; name: string; uri: string; bot: boolean; disabled: boolean; onRemove: (userid: number) => void }) {
  const t = useT();
  const { theme } = useUnistyles();
  const remove = useCallback(() => onRemove(userid), [onRemove, userid]);
  const label = name || t('messenger:group.create.members');
  return (
    <Touchable accessibilityRole="button" accessibilityLabel={t('messenger:group.create.removeMember', { name: label })} disabled={disabled} onPress={remove} style={({ pressed }) => styles.member(pressed)}>
      <UserAvatar userid={userid} name={name} uri={uri} bot={bot} size={theme.size.avatar.xl} />
      <View style={styles.remove}><Icon icon={X} color={theme.colors.surface} size={theme.size.groupCreate.removeIconNative} /></View>
      <Text style={styles.memberName} numberOfLines={1}>{label}</Text>
    </Touchable>
  );
});

const AddMember = memo(function AddMember({ disabled, onPress }: { disabled: boolean; onPress: () => void }) {
  const t = useT();
  const { theme } = useUnistyles();
  return (
    <Touchable accessibilityRole="button" accessibilityLabel={t('messenger:group.create.addMembers')} disabled={disabled} onPress={onPress} style={({ pressed }) => styles.member(pressed)}>
      <View style={styles.add}><Icon icon={Plus} color={theme.colors.text2} size={theme.size.icon} /></View>
      <Text style={styles.memberName}>{t('messenger:group.create.add')}</Text>
    </Touchable>
  );
});

function MemberGap() { return <View style={styles.memberGap} />; }

const styles = StyleSheet.create((theme) => ({
  body: { paddingBottom: theme.spacing.lg, gap: theme.spacing.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingHorizontal: theme.spacing.page },
  avatarButton: (pressed: boolean) => ({ opacity: pressed ? theme.opacity.pressedIcon : 1 }),
  emptyAvatar: { width: theme.size.groupCreate.avatarNative, height: theme.size.groupCreate.avatarNative, borderRadius: theme.radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.fill },
  avatarBusy: { ...StyleSheet.absoluteFillObject, borderRadius: theme.radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.hover },
  name: { flex: 1, minWidth: 0 },
  memberSection: { gap: theme.spacing.md },
  memberLabel: { ...theme.typography.footnote, marginHorizontal: theme.spacing.page, marginTop: theme.spacing.xs, color: theme.colors.text3 },
  memberList: { height: theme.size.groupCreate.memberList },
  members: { paddingHorizontal: theme.spacing.page },
  memberGap: { width: theme.spacing.md },
  addGap: { marginLeft: theme.spacing.md },
  member: (pressed: boolean) => ({ width: theme.size.groupCreate.memberWidth, alignItems: 'center', gap: theme.spacing.xs, opacity: pressed ? theme.opacity.pressedIcon : 1 }),
  memberName: { ...theme.typography.caption, maxWidth: theme.size.groupCreate.memberWidth, color: theme.colors.text2 },
  remove: { position: 'absolute', top: 0, right: 0, width: theme.size.groupCreate.removeNative, height: theme.size.groupCreate.removeNative, borderRadius: theme.radius.pill, borderWidth: theme.size.groupCreate.removeBorderNative, borderColor: theme.colors.surface, backgroundColor: theme.colors.text3, alignItems: 'center', justifyContent: 'center' },
  add: { width: theme.size.avatar.xl, height: theme.size.avatar.xl, borderRadius: theme.radius.pill, borderWidth: theme.size.groupCreate.addBorderNative, borderStyle: 'dashed', borderColor: theme.colors.text4, alignItems: 'center', justifyContent: 'center' },
  error: { ...theme.typography.footnote, color: theme.colors.danger, marginHorizontal: theme.spacing.page },
}));
