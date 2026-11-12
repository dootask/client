import { memo } from 'react';
import { Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import { UserAvatar } from '../../../ui/Avatar';
import { Touchable } from '../../../ui/Touchable';

export interface MemberRowProps {
  userid: number; name: string; uri?: string | null; bot: boolean; online: boolean;
  role: 'owner' | 'deputy' | ''; removable: boolean; appointable: boolean;
  onOpen: (id: number) => void; onProfile: (id: number) => void;
  onAction: (id: number, action: 'remove' | 'deputy') => void;
}

export const MemberRow = memo(function MemberRow({ userid, name, uri, bot, online, role, onOpen }: MemberRowProps) {
  const t = useT();
  const { theme } = useUnistyles();
  return <Touchable testID={`members-row-${userid}`} onPress={() => onOpen(userid)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
    <UserAvatar userid={userid} name={name} uri={uri} bot={bot} online={online} size={theme.size.avatar.lg} />
    <Text style={styles.name} numberOfLines={1}>{name}</Text>
    {!!role && <View testID={`members-role-${role}`} style={styles.tag}><Text style={styles.tagText}>{t(role === 'owner' ? 'messenger:group.members.owner' : 'messenger:group.members.deputy')}</Text></View>}
    {bot && <Text style={styles.bot}>{t('messenger:tag.bot')}</Text>}
  </Touchable>;
});

const styles = StyleSheet.create((theme) => ({
  row: { minHeight: theme.size.rowDouble, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingHorizontal: theme.spacing.page, paddingVertical: theme.spacing.sm },
  pressed: { backgroundColor: theme.colors.fillPressed },
  name: { ...theme.typography.body, flex: 1, color: theme.colors.text },
  tag: { paddingHorizontal: theme.spacing.xs, paddingVertical: theme.size.listLineGap, borderRadius: theme.radius.block, backgroundColor: theme.colors.primarySoft },
  tagText: { ...theme.typography.caption2, color: theme.colors.primaryText },
  bot: { ...theme.typography.caption2, color: theme.colors.text3 },
}));
