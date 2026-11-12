import { LogOut, Minus, Plus } from 'lucide-react-native';
import { memo } from 'react';
import { Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import { UserAvatar } from '../../../ui/Avatar';
import { Icon } from '../../../ui/Icon';
import { Tooltip } from '../../../ui/popover';
import { Touchable } from '../../../ui/Touchable';
import type { MemberRowProps } from './MemberRow';

export const MemberRow = memo(function MemberRow({ userid, name, uri, bot, role, removable, appointable, onProfile, onAction }: MemberRowProps) {
  const t = useT();
  const { theme } = useUnistyles();
  return <Touchable testID={`members-row-${userid}`} onPress={() => onProfile(userid)} style={({ hovered }) => [styles.row, hovered && styles.hover]}>
    {({ hovered }) => <>
      <UserAvatar userid={userid} name={name} uri={uri} bot={bot} size={theme.size.avatar.md} />
      {!!role && <View testID={`members-role-${role}`} style={styles.tag(role === 'owner')}><Text style={styles.tagText}>{t(role === 'owner' ? 'messenger:group.members.owner' : 'messenger:group.members.deputy')}</Text></View>}
      <Text style={styles.name} numberOfLines={1}>{name}</Text>
      {hovered && appointable && <Tooltip label={t(role === 'deputy' ? 'messenger:group.members.removeDeputy' : 'messenger:group.members.appoint')}><Touchable accessibilityRole="button" accessibilityLabel={t(role === 'deputy' ? 'messenger:group.members.removeDeputy' : 'messenger:group.members.appoint')} style={styles.action} onPress={(event) => { event.stopPropagation(); onAction(userid, 'deputy'); }}><Icon icon={role === 'deputy' ? Minus : Plus} size={theme.size.iconSmall} color={theme.colors.regularText} /></Touchable></Tooltip>}
      {hovered && removable && <Tooltip label={t('messenger:group.members.remove')}><Touchable accessibilityRole="button" accessibilityLabel={t('messenger:group.members.remove')} style={styles.action} onPress={(event) => { event.stopPropagation(); onAction(userid, 'remove'); }}><Icon icon={LogOut} size={theme.size.iconSmall} color={theme.colors.regularText} /></Touchable></Tooltip>}
    </>}
  </Touchable>;
});

const styles = StyleSheet.create((theme, rt) => ({
  row: { marginHorizontal: rt.breakpoint === 'xs' ? theme.size.group.fieldXNarrow : theme.size.group.rowInset, height: theme.size.group.row, paddingHorizontal: theme.size.group.rowPad, flexDirection: 'row', alignItems: 'center', gap: theme.size.group.rowGap, borderRadius: theme.size.group.rowRadius },
  hover: { backgroundColor: theme.colors.memberHover },
  name: { flex: 1, ...theme.typography.memberName, color: theme.colors.regularText },
  tag: (owner: boolean) => ({ height: theme.size.group.role, borderRadius: theme.size.group.roleRadius, paddingHorizontal: theme.size.group.rolePad, backgroundColor: owner ? theme.colors.primary : theme.colors.warning }),
  tagText: { ...theme.typography.memberRole, color: theme.colors.onPrimary },
  action: { width: theme.size.group.action, height: theme.size.group.action, alignItems: 'center', justifyContent: 'center' },
}));
