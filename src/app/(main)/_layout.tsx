import { TabSlot, useTabsWithTriggers } from 'expo-router/ui';

import { MAIN_TABS, MainNav, SETTINGS_TAB } from '../../modules/shell';
import { AppFrame } from '../../ui/layout';

const TRIGGERS = [...MAIN_TABS, SETTINGS_TAB].map((tab) => ({ type: 'internal' as const, name: tab.name, href: tab.href }));

/** 主框架：五个 Tab + 设置。窄屏底部 Tab、中屏图标侧栏、宽屏完整侧栏，URL 不随形态变化 */
export default function MainLayout() {
  const { NavigationContent } = useTabsWithTriggers({ triggers: TRIGGERS });
  return (
    <NavigationContent>
      <AppFrame nav={(variant) => <MainNav variant={variant} />}>
        <TabSlot />
      </AppFrame>
    </NavigationContent>
  );
}
