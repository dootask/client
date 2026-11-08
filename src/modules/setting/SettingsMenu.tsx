import { router, usePathname } from 'expo-router';
import { Languages, Palette } from 'lucide-react-native';
import { ScrollView } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useT } from '../../i18n';
import { useSplitView } from '../../ui/layout';
import { ListRow } from '../../ui/ListRow';

const ITEMS = [
  { href: '/settings/appearance', label: 'setting:theme.title', icon: Palette },
  { href: '/settings/language', label: 'setting:language.title', icon: Languages },
] as const;

/** 设置的一级列表：窄屏是设置首页，并排视图里是左侧列表栏 */
export function SettingsMenu() {
  const t = useT();
  const pathname = usePathname();
  const split = useSplitView();
  return (
    <ScrollView style={styles.root}>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
}));
