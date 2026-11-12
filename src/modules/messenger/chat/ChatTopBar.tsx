import { ChatBanners } from './ChatBanners';
import { ChatHeader } from './ChatHeader';
import type { ChatTopBarProps } from './chatTopBarTypes';

/** Web 聊天页顶部：多选时保持原样，导航栏和横条都不变 */
export function ChatTopBar({ dialogId, dialog, onJump, onSessionChanged }: ChatTopBarProps) {
  return (
    <>
      <ChatHeader dialogId={dialogId} dialog={dialog} onSessionChanged={onSessionChanged} />
      <ChatBanners dialog={dialog} onJump={onJump} />
    </>
  );
}
