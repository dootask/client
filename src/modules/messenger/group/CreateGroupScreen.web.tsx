import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Plus, X } from 'lucide-react-native';
import { memo, useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import { UserAvatar } from '../../../ui/Avatar';
import { DooButton, DooModal } from '../../../ui/DooModal';
import { Icon } from '../../../ui/Icon';
import { Touchable } from '../../../ui/Touchable';
import { DialogPicker } from '../picker/DialogPicker';
import type { PickUser } from '../picker/pickerData';
import { closeCreateGroupRoute, CREATE_GROUP_MODAL_OPTIONS, type CreateGroupParams, MAX_CREATE_MEMBERS, openCreatedGroup, useCreateGroup } from './create';

export function CreateGroupRoute() {
  const params = useLocalSearchParams<CreateGroupParams>();
  return <CreateGroupScreen key={String(params.userids ?? '')} userids={params.userids} />;
}

/** 旧 Web manage.vue 建群表单：宽屏标签在左，窄屏标签在上；选人单独叠层，取消不改原选择。 */
export function CreateGroupScreen(params: CreateGroupParams) {
  const t = useT();
  const { theme, rt } = useUnistyles();
  const narrow = rt.breakpoint === 'xs';
  const form = useCreateGroup(params, openCreatedGroup);
  const locked = form.creating || form.avatarPicking;
  const canClose = form.canClose;
  const close = useCallback(() => {
    if (canClose()) closeCreateGroupRoute();
  }, [canClose]);
  const footer = useMemo(() => (
    <>
      <DooButton testID="create-group-cancel" label={t('messenger:group.create.cancel')} disabled={locked} onPress={close} />
      <DooButton testID="create-group-confirm" label={t('messenger:group.create.submit')} primary disabled={!form.canCreate} onPress={form.create} suffix={form.creating ? <ActivityIndicator size="small" color={theme.colors.onPrimary} /> : undefined} />
    </>
  ), [t, locked, close, form.canCreate, form.create, form.creating, theme.colors.onPrimary]);

  return (
    <>
      <Stack.Screen options={CREATE_GROUP_MODAL_OPTIONS} />
      <DooModal visible title={t('messenger:group.create.title')} onClose={close} width={narrow ? theme.size.groupCreate.narrowWidth : theme.size.groupCreate.width} footer={footer} testID="create-group">
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
          <View testID="create-group-avatar" style={styles.field(narrow)}>
            <Text style={styles.label(narrow)}>{t('messenger:group.create.avatar')}</Text>
            <View style={styles.value(narrow)}>
              <GroupAvatar image64={form.image64} disabled={locked} picking={form.avatarPicking} onChange={form.changeAvatar} onRemove={form.clearAvatar} />
            </View>
          </View>
          <View testID="create-group-members" style={styles.field(narrow)}>
            <Text style={styles.label(narrow)}>{t('messenger:group.create.members')}</Text>
            <View style={styles.value(narrow)}>
              <Members selected={form.selected} disabled={locked} narrow={narrow} onRemove={form.remove} onAdd={form.openPicker} />
            </View>
          </View>
          <View testID="create-group-name" style={styles.field(narrow)}>
            <Text style={styles.label(narrow)}>{t('messenger:group.create.name')}</Text>
            <View style={styles.value(narrow)}><GroupName disabled={locked} onChange={form.onNameChange} /></View>
          </View>
          {!!form.error && <Text accessibilityRole="alert" style={styles.error}>{form.error}</Text>}
        </ScrollView>
      </DooModal>
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
  const { theme } = useUnistyles();
  const [name, setName] = useState('');
  const [focused, setFocused] = useState(false);
  const change = useCallback((value: string) => {
    setName(value);
    onChange(value);
  }, [onChange]);
  const focus = useCallback(() => setFocused(true), []);
  const blur = useCallback(() => setFocused(false), []);
  return (
    <TextInput
      testID="create-group-name-input"
      accessibilityLabel={t('messenger:group.create.name')}
      value={name}
      onChangeText={change}
      placeholder={t('messenger:group.create.namePlaceholder')}
      placeholderTextColor={theme.colors.placeholder}
      editable={!disabled}
      onFocus={focus}
      onBlur={blur}
      style={styles.input(focused)}
    />
  );
});

const GroupAvatar = memo(function GroupAvatar({ image64, disabled, picking, onChange, onRemove }: { image64: string | null; disabled: boolean; picking: boolean; onChange: () => void; onRemove: () => void }) {
  const t = useT();
  const { theme } = useUnistyles();
  const u = theme.size.groupCreate;
  return (
    <View style={styles.avatarRow}>
      <Touchable accessibilityRole="button" accessibilityLabel={t('messenger:group.create.changeAvatar')} disabled={disabled} onPress={onChange} style={({ pressed, hovered }) => styles.avatar(pressed, hovered, !!image64)}>
        {image64 ? (
          // expo-image 不接管 unistyles 生成的样式，尺寸直接引用令牌。
          <Image source={image64} contentFit="cover" style={{ width: u.avatar, height: u.avatar, borderRadius: theme.radius.menu }} />
        ) : <Icon icon={Plus} color={theme.colors.regularText} size={u.avatarIcon} />}
        {picking && <View style={styles.avatarBusy}><ActivityIndicator color={theme.colors.primary} /></View>}
      </Touchable>
      {image64 && (
        <Touchable accessibilityRole="button" accessibilityLabel={t('messenger:group.create.removeAvatar')} disabled={disabled} onPress={onRemove} style={({ pressed, hovered }) => styles.smallButton(pressed, hovered)}>
          <Icon icon={X} color={theme.colors.regularText} size={u.addIcon} />
        </Touchable>
      )}
    </View>
  );
});

const Members = memo(function Members({ selected, disabled, narrow, onRemove, onAdd }: { selected: PickUser[]; disabled: boolean; narrow: boolean; onRemove: (userid: number) => void; onAdd: () => void }) {
  const t = useT();
  const { theme } = useUnistyles();
  return (
    <View style={styles.members(narrow)}>
      {selected.map((item) => <Member key={item.userid} userid={item.userid} name={item.nickname} uri={item.userimg} bot={item.bot} disabled={disabled} onRemove={onRemove} onOpen={onAdd} />)}
      <Touchable accessibilityRole="button" accessibilityLabel={t('messenger:group.create.addMembers')} disabled={disabled} onPress={onAdd} style={({ pressed, hovered }) => styles.smallButton(pressed, hovered)}>
        <Icon icon={Plus} color={theme.colors.regularText} size={theme.size.groupCreate.addIcon} />
      </Touchable>
      {selected.length > 0 && <Text style={styles.selectedCount}>{t('messenger:group.create.selectedCount', { n: selected.length })}</Text>}
    </View>
  );
});

const Member = memo(function Member({ userid, name, uri, bot, disabled, onRemove, onOpen }: { userid: number; name: string; uri: string; bot: boolean; disabled: boolean; onRemove: (userid: number) => void; onOpen: () => void }) {
  const t = useT();
  const { theme } = useUnistyles();
  const remove = useCallback(() => onRemove(userid), [onRemove, userid]);
  const label = name || t('messenger:group.create.members');
  return (
    <View style={styles.member}>
      <Touchable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onOpen}>
        <UserAvatar userid={userid} name={name} uri={uri} bot={bot} size={theme.size.avatar.pickChip} />
      </Touchable>
      <Touchable accessibilityRole="button" accessibilityLabel={t('messenger:group.create.removeMember', { name: label })} disabled={disabled} onPress={remove} hitSlop={theme.spacing.xs} style={({ hovered }) => styles.remove(hovered)}>
        <Icon icon={X} color={theme.colors.onPrimary} size={theme.size.groupCreate.removeIcon} />
      </Touchable>
    </View>
  );
});

const styles = StyleSheet.create((theme) => {
  const u = theme.size.groupCreate;
  return {
    form: { gap: u.fieldGap, paddingBottom: u.fieldGap },
    field: (narrow: boolean) => ({ flexDirection: narrow ? 'column' : 'row', alignItems: narrow ? 'stretch' : 'flex-start', gap: narrow ? u.labelGapNarrow : 0 }),
    label: (narrow: boolean) => ({ ...theme.typography.cardText, width: narrow ? undefined : u.label, lineHeight: narrow ? theme.typography.cardText.lineHeight : u.input, paddingRight: narrow ? 0 : theme.spacing.md, fontWeight: narrow ? '600' : '400', color: theme.colors.regularText }),
    value: (narrow: boolean) => ({ flex: narrow ? undefined : 1, minWidth: 0 }),
    input: (focused: boolean) => ({ fontSize: theme.typography.cardText.fontSize, fontWeight: theme.typography.cardText.fontWeight, height: u.input, paddingHorizontal: u.inputPadX, paddingVertical: u.inputPadY, borderWidth: u.border, borderColor: focused ? theme.colors.primary : theme.colors.headerLine, borderRadius: theme.radius.menu, backgroundColor: theme.colors.surface, color: theme.colors.regularText, outlineStyle: 'solid', outlineWidth: 0 }),
    avatarRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
    avatar: (pressed: boolean, hovered: boolean, filled: boolean) => ({ width: u.avatar, height: u.avatar, borderWidth: filled ? 0 : u.border, borderStyle: 'dashed', borderColor: hovered ? theme.colors.regularText : theme.colors.ivuBorder, borderRadius: theme.radius.menu, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: hovered ? theme.colors.menuHover : theme.colors.surface, opacity: pressed ? theme.opacity.pressedIcon : 1 }),
    avatarBusy: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.hover },
    members: (narrow: boolean) => ({ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.spacing.sm, minHeight: narrow ? u.add : u.membersMin }),
    smallButton: (pressed: boolean, hovered: boolean) => ({ width: u.add, height: u.add, borderRadius: theme.radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: hovered ? theme.colors.fillPressed : theme.colors.bg, opacity: pressed ? theme.opacity.pressedIcon : 1 }),
    member: { width: theme.size.avatar.pickChip, height: theme.size.avatar.pickChip },
    remove: (hovered: boolean) => ({ position: 'absolute', top: -theme.spacing.xs, right: -theme.spacing.xs, width: u.removeNative, height: u.removeNative, borderRadius: theme.radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: hovered ? theme.colors.regularText : theme.colors.text3 }),
    selectedCount: { ...theme.typography.caption, color: theme.colors.descText },
    error: { ...theme.typography.footnote, color: theme.colors.danger },
  };
});
