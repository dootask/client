import { ScrollView } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useT } from '../../i18n';
import { ListRow } from '../../ui/ListRow';
import { THEME_MODES, useThemeMode } from '../../ui/theme';
import { changeThemeMode } from './preferences';

const LABELS = { system: 'setting:theme.system', light: 'setting:theme.light', dark: 'setting:theme.dark' } as const;

/** 深浅色：跟随系统 / 浅色 / 深色，点了立即生效 */
export function AppearanceSettings() {
  const t = useT();
  const mode = useThemeMode();
  return (
    <ScrollView style={styles.root}>
      {THEME_MODES.map((item) => (
        <ListRow key={item} title={t(LABELS[item])} accessory={item === mode ? 'check' : 'none'} onPress={() => changeThemeMode(item)} />
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
