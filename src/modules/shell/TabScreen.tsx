import { router } from 'expo-router';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useT } from '../../i18n';
import { IconButton } from '../../ui/IconButton';
import { useSplitView } from '../../ui/layout';
import { PageHeader } from '../../ui/PageHeader';
import { PlaceholderScreen } from '../../ui/PlaceholderScreen';
import { MAIN_TABS, type MainTab, SETTINGS_TAB } from './tabs';

/**
 * 还没重写的 Tab：导航栏 + 「开发中」占位。
 * 窄屏没有侧栏，设置入口放在仪表盘的导航栏右上角
 */
export function TabScreen({ label }: { label: MainTab['label'] }) {
  const t = useT();
  const split = useSplitView();
  const showSettings = !split && label === MAIN_TABS[0]?.label;
  return (
    <View style={styles.root}>
      <PageHeader
        title={t(label)}
        right={showSettings && <IconButton icon={SETTINGS_TAB.icon} label={t(SETTINGS_TAB.label)} onPress={() => router.navigate(SETTINGS_TAB.href)} />}
      />
      <PlaceholderScreen title={t(label)} subtitle={t('wip')} />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
}));
