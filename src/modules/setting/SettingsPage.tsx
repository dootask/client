import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useT } from '../../i18n';
import { IconButton } from '../../ui/IconButton';
import { useSplitView } from '../../ui/layout';
import { PageHeader } from '../../ui/PageHeader';
import { MAIN_TABS } from '../shell';
import { SettingsMenu } from './SettingsMenu';

type Title = 'setting:title' | 'setting:theme.title' | 'setting:language.title' | 'setting:keyboard.title';

/** 设置里的一页：导航栏 + 内容。窄屏左上角返回（没有历史时回首页），并排视图里没有返回（列表就在左边） */
export function SettingsPage({ title, back = true, children }: { title: Title; back?: boolean; children: ReactNode }) {
  const t = useT();
  const split = useSplitView();
  return (
    <View style={styles.root}>
      <PageHeader
        title={t(title)}
        left={back && !split && <IconButton icon={ChevronLeft} label={t('back')} onPress={() => (router.canGoBack() ? router.back() : router.navigate(MAIN_TABS[0].href))} />}
      />
      {children}
    </View>
  );
}

/** 并排视图左侧的列表栏 */
export function SettingsPane() {
  return (
    <SettingsPage title="setting:title" back={false}>
      <SettingsMenu />
    </SettingsPage>
  );
}

/** 设置首页：窄屏是列表；并排视图里列表已经在左边，右边留空 */
export function SettingsHome() {
  const split = useSplitView();
  if (split) return <View style={styles.root} />;
  return (
    <SettingsPage title="setting:title">
      <SettingsMenu />
    </SettingsPage>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
}));
