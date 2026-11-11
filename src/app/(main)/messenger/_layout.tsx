import { Stack } from 'expo-router';

import { DialogList } from '../../../modules/messenger';
import { ListDetail, useSplitView } from '../../../ui/layout';

// 直接打开某个会话（深链、刷新）时栈底也垫上列表，窄屏返回回到会话列表
export const unstable_settings = { anchor: 'index' };

/** 消息：窄屏会话列表 → 聊天整页推入；中屏、宽屏左边会话列表（同旧版固定比例）右边聊天 */
export default function MessengerLayout() {
  const split = useSplitView();
  return (
    <ListDetail list={<DialogList />} dialog>
      <Stack screenOptions={{ headerShown: false, animation: split ? 'none' : 'default' }} />
    </ListDetail>
  );
}
