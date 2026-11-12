import { Stack, useGlobalSearchParams, usePathname } from 'expo-router';
import { useEffect } from 'react';

import { ContactsList } from '../../../modules/contacts/ContactsList';
import { useContactsDialog } from '../../../modules/contacts/navigation';

import { DialogList } from '../../../modules/messenger';
import { ListDetail, SIDE_PAGE_OPTIONS, useSplitView } from '../../../ui/layout';

/** 会话的二级页：App 上推入，网页上是盖在聊天页上的右侧抽屉（SidePage） */
const SIDE_PAGES = ['info/[dialogId]', 'members/[dialogId]', 'search/[dialogId]', 'media/[dialogId]', 'report/[dialogId]', 'bot/[dialogId]', 'thread/[msgId]'];

const SINGLE_CHAT = () => 'chat';

// 直接打开某个会话（深链、刷新）时栈底也垫上列表，窄屏返回回到会话列表
export const unstable_settings = { anchor: 'index' };

/** 消息：窄屏会话列表 → 聊天整页推入；中屏、宽屏左边会话列表（同旧版固定比例）右边聊天 */
export default function MessengerLayout() {
  const split = useSplitView();
  const pathname = usePathname();
  const { dialogId } = useGlobalSearchParams<{ dialogId?: string }>();
  const contactsDialog = useContactsDialog((s) => s.dialogId);
  const contacts = contactsDialog > 0 && pathname !== '/messenger' && Number(dialogId) === contactsDialog;
  useEffect(() => {
    if (pathname === '/messenger') useContactsDialog.setState({ dialogId: 0 });
  }, [pathname]);
  return (
    <ListDetail list={contacts ? <ContactsList /> : <DialogList />} dialog>
      <Stack screenOptions={{ headerShown: false, animation: split ? 'none' : 'default' }}>
        {/* 中屏、宽屏只留一个聊天页：切会话时换参数重建，不在下面堆着隐藏的旧聊天页（旧页还挂着会继续上报看到的消息、记位置） */}
        <Stack.Screen name="[dialogId]" dangerouslySingular={split ? SINGLE_CHAT : undefined} />
        {SIDE_PAGES.map((name) => (
          <Stack.Screen key={name} name={name} options={SIDE_PAGE_OPTIONS} />
        ))}
      </Stack>
    </ListDetail>
  );
}
