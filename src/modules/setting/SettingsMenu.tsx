import { router, usePathname } from 'expo-router';
import { Keyboard, Languages, LogOut, Palette } from 'lucide-react-native';
import { PixelRatio, ScrollView, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../i18n';
import { Icon } from '../../ui/Icon';
import { useSplitView } from '../../ui/layout';
import { ListRow } from '../../ui/ListRow';
import { Confirm } from '../../ui/popover';
import { signOut, useSession } from '../session';

const ITEMS = [
  { href: '/settings/appearance', label: 'setting:theme.title', icon: Palette },
  { href: '/settings/language', label: 'setting:language.title', icon: Languages },
  { href: '/settings/keyboard', label: 'setting:keyboard.title', icon: Keyboard },
] as const;

/** 设置的一级列表：窄屏是设置首页，并排视图里是左侧列表栏 */
export function SettingsMenu() {
  const t = useT();
  const pathname = usePathname();
  const split = useSplitView();
  return (
    <ScrollView style={styles.root}>
      <Account />
      {ITEMS.map((item) => (
        <ListRow
          key={item.href}
          title={t(item.label)}
          icon={item.icon}
          accessory={split ? 'none' : 'chevron'}
          selected={split && pathname === item.href}
          onPress={() => router.navigate(item.href)}
        />
      ))}
      <View style={styles.gap} />
      <Confirm
        title={t('setting:logoutConfirm')}
        confirmLabel={t('setting:logout')}
        destructive
        onConfirm={signOut}
        style={({ pressed, hovered }) => styles.row(pressed, hovered)}
      >
        <LogoutLabel />
      </Confirm>
    </ScrollView>
  );
}

/** 当前账号：昵称和邮箱 */
function Account() {
  const user = useSession((state) => state.user);
  if (!user) return null;
  return (
    <View style={styles.account}>
      <Text style={styles.name} numberOfLines={1}>
        {user.nickname || user.email}
      </Text>
      {!!user.nickname && (
        <Text style={styles.email} numberOfLines={1}>
          {user.email}
        </Text>
      )}
    </View>
  );
}

function LogoutLabel() {
  const t = useT();
  const { theme } = useUnistyles();
  return (
    <>
      <Icon icon={LogOut} color={theme.colors.danger} size={theme.size.icon} />
      <Text style={styles.danger}>{t('setting:logout')}</Text>
    </>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  account: {
    paddingHorizontal: theme.spacing.page,
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  name: {
    ...theme.typography.title2,
    color: theme.colors.text,
  },
  email: {
    ...theme.typography.footnote,
    color: theme.colors.text3,
  },
  gap: {
    height: theme.spacing.xxl,
  },
  row: (pressed: boolean, hovered: boolean) => ({
    minHeight: PixelRatio.roundToNearestPixel(theme.size.rowSingle),
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.page,
    backgroundColor: pressed ? theme.colors.fillPressed : hovered ? theme.colors.hover : theme.colors.surface,
  }),
  danger: {
    ...theme.typography.body,
    color: theme.colors.danger,
  },
}));
