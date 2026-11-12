import { Stack } from 'expo-router';

import { DialogList } from '../../../modules/messenger';
import { ListDetail, SIDE_PAGE_OPTIONS, useSplitView } from '../../../ui/layout';

/** 会话的二级页：App 上推入，网页上是盖在聊天页上的右侧抽屉（SidePage） */
const SIDE_PAGES = ['info/[dialogId]', 'members/[dialogId]', 'search/[dialogId]', 'media/[dialogId]', 'report/[dialogId]', 'bot/[dialogId]'];

// 直接打开某个会话（深链、刷新）时栈底也垫上列表，窄屏返回回到会话列表
export const unstable_settings = { anchor: 'index' };

/** 消息：窄屏会话列表 → 聊天整页推入；中屏、宽屏左边会话列表（同旧版固定比例）右边聊天 */
export default function MessengerLayout() {
  const split = useSplitView();
  return (
    <ListDetail list={<DialogList />} dialog>
      <Stack screenOptions={{ headerShown: false, animation: split ? 'none' : 'default' }}>
        {SIDE_PAGES.map((name) => (
          <Stack.Screen key={name} name={name} options={SIDE_PAGE_OPTIONS} />
        ))}
      </Stack>
    </ListDetail>
  );
}
