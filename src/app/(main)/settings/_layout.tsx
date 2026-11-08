import { Stack } from 'expo-router';

import { SettingsPane } from '../../../modules/setting';
import { ListDetail, useSplitView } from '../../../ui/layout';

// 直接打开子页（深链、刷新）时栈底也垫上设置首页，窄屏返回回到设置菜单
export const unstable_settings = { anchor: 'index' };

/** 设置：窄屏两级页（详情整页推入、可侧滑返回）；中屏、宽屏左边列表右边详情 */
export default function SettingsLayout() {
  const split = useSplitView();
  return (
    <ListDetail list={<SettingsPane />}>
      <Stack screenOptions={{ headerShown: false, animation: split ? 'none' : 'default' }} />
    </ListDetail>
  );
}
