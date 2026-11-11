import { useSegments } from 'expo-router';
import { TabSlot, useTabsWithTriggers } from 'expo-router/ui';
import { useCallback } from 'react';
import { StyleSheet } from 'react-native';

import { shakeUnread, useTabBadge } from '../../modules/messenger';
import { MAIN_TABS, MainNav, SETTINGS_TAB } from '../../modules/shell';
import { AppFrame } from '../../ui/layout';

const TRIGGERS = [...MAIN_TABS, SETTINGS_TAB].map((tab) => ({ type: 'internal' as const, name: tab.name, href: tab.href }));

/** 主框架：五个 Tab + 设置。窄屏底部 Tab、中屏图标侧栏、宽屏完整侧栏，URL 不随形态变化 */
export default function MainLayout() {
  const { NavigationContent } = useTabsWithTriggers({ triggers: TRIGGERS });
  // (main)/<tab>/<子页>：窄屏推入的二级页不显示底部 Tab
  const nested = useSegments().length > 2;
  const messengerBadge = useTabBadge();
  const onReselect = useCallback((name: string) => {
    if (name === 'messenger') shakeUnread();
  }, []);
  return (
    <NavigationContent>
      <AppFrame hideTabBar={nested} nav={(variant) => <MainNav variant={variant} badges={{ messenger: messengerBadge }} onReselect={onReselect} />}>
        <TabSlot style={styles.slot} />
      </AppFrame>
    </NavigationContent>
  );
}

const styles = StyleSheet.create({
  // TabSlot 默认不收缩，内容（长列表）会把它撑得比窗口还高。
  // 用 RN 的 StyleSheet：TabSlot 不是 unistyles 接管的组件，Web 上收不到 unistyles 生成的样式
  slot: {
    flexShrink: 1,
    minHeight: 0,
  },
});
