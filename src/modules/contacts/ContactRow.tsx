import { router } from 'expo-router';
import { ChevronRight, MessageCircle, UserRound, UsersRound } from 'lucide-react-native';
import { memo } from 'react';
import { Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../i18n';
import { UserAvatar } from '../../ui/Avatar';
import { Icon } from '../../ui/Icon';
import { Menu } from '../../ui/popover';
import { Touchable } from '../../ui/Touchable';
import { useUser } from '../messenger/hooks';
import { openProfile } from '../messenger/user/navigation';
import { useSession } from '../session';

export const ContactLabel = memo(function ContactLabel({ title, level, department, count, expanded, onToggle }: { title: string; level: number; department?: number; count?: number; expanded?: boolean; onToggle: (id: number) => void }) {
  const t = useT();
  const { theme } = useUnistyles();
  const name = department === 0 ? t('messenger:contacts.noDepartment') : title;
  return (
    <Touchable testID={department === undefined ? `contacts-letter-${title}` : `contacts-department-${department}`} accessibilityRole={department === undefined ? 'header' : 'button'} accessibilityLabel={name} aria-expanded={department === undefined ? undefined : expanded} disabled={department === undefined} onPress={() => department !== undefined && onToggle(department)} style={styles.label(level)}>
      {department !== undefined && <View style={styles.arrow(expanded ?? false)}><Icon icon={ChevronRight} size={theme.size.contacts.arrow} color={theme.colors.searchIcon} /></View>}
      <Text style={styles.labelName} numberOfLines={1}>{name}</Text>
      {count !== undefined && <Text style={styles.count}>{count}</Text>}
    </Touchable>
  );
});

export const ContactPerson = memo(function ContactPerson({ userid, nickname, uri, online, tags, level, narrow, onOpen }: { userid: number; nickname: string; uri: string; online: boolean; tags: string; level: number; narrow: boolean; onOpen: (id: number) => void }) {
  const t = useT();
  const { theme } = useUnistyles();
  const live = useUser(userid)?.online;
  const self = useSession((s) => s.user?.userid === userid);
  return (
    // 自绘菜单（同会话列表）：每行不挂原生菜单视图，长列表快速滑动时新建行更轻
    <Menu trigger="context" drawn button accessibilityLabel={nickname} onPress={() => onOpen(userid)} style={styles.person(level, narrow)} items={() => [
      { label: t('messenger:contacts.message'), icon: MessageCircle, onSelect: () => onOpen(userid) },
      { label: t('messenger:profile.createGroup'), icon: UsersRound, onSelect: () => router.push({ pathname: '/group/create', params: { userids: String(userid) } }) },
      { label: t('messenger:contacts.viewProfile'), icon: UserRound, onSelect: () => openProfile(userid) },
    ]}>
      <UserAvatar userid={userid} name={nickname} uri={uri} size={narrow ? theme.size.avatar.pickSel : theme.size.avatar.msg} online={self || (live ?? online)} statusSize={narrow ? theme.size.contacts.dotNarrow : theme.size.contacts.dot} />
      <View style={styles.nickname}>
        <Text style={styles.name} numberOfLines={1}>{nickname}</Text>
        {!!tags && <Text style={styles.tags} numberOfLines={1}>{tags}</Text>}
      </View>
    </Menu>
  );
});

const styles = StyleSheet.create((theme) => ({
  label: (level: number) => ({ height: theme.size.contacts.label, marginVertical: theme.size.contacts.labelGap, marginRight: theme.size.contacts.labelRight, paddingLeft: theme.size.contacts.labelIndent + level * theme.size.contacts.depthIndent, flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface }),
  arrow: (expanded: boolean) => ({ width: theme.size.contacts.arrow, height: theme.size.contacts.arrow, marginRight: theme.size.contacts.arrowGap, transform: [{ rotate: expanded ? '90deg' : '0deg' }] }),
  labelName: { ...theme.typography.contactsLabel, color: theme.colors.regularText, flex: 1 },
  count: { ...theme.typography.contactsCount, color: theme.colors.searchIcon, paddingRight: theme.size.contacts.countRight, marginLeft: theme.spacing.sm },
  person: (level: number, narrow: boolean) => ({ height: narrow ? theme.size.contacts.rowNarrow : theme.size.contacts.row, marginLeft: theme.size.contacts.rowIndent + level * theme.size.contacts.depthIndent, flexDirection: 'row', alignItems: 'center' }),
  nickname: { flex: 1, minWidth: 0, paddingLeft: theme.size.contacts.nameGap, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { ...theme.typography.contactsName, color: theme.colors.regularText, flexShrink: 1, paddingRight: theme.size.contacts.tagRight },
  tags: { ...theme.typography.contactsTag, color: theme.colors.descText, paddingRight: theme.size.contacts.tagRight, flexShrink: 1, textAlign: 'right' },
}));
