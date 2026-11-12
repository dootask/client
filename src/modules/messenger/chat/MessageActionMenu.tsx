import { useEffect } from 'react';
import { useWindowDimensions } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';

import type { Msg } from '../../../sync/api/dialog';
import { reactions, type MsgBody } from '../../../sync/messenger/body';
import type { MessageRenderInfo } from '../../../ui/chat';
import { ActionMenu } from '../../../ui/chat/ActionMenu';
import type { MenuEntry } from '../../../ui/popover';
import { toSections } from '../../../ui/popover/menuModel';
import type { Rect } from '../../../ui/popover/position';
import { useMessengerState, useMsgActions } from '../hooks';
import type { RowData } from './chatModel';
import { EMOJIS, quickReactions, rememberReaction } from './emoji';
import { MessagePreview } from './MsgBubble';

export interface LongPressTarget {
  /** 被长按的整行在窗口里的位置 */
  anchor: Rect;
  info: MessageRenderInfo<RowData>;
  msg: Msg;
  body: MsgBody;
}

/**
 * App 长按消息：浮起这条消息、上方表情条、下方分组菜单。
 * 打开时查一次收藏状态，查到后菜单里的「收藏 / 取消收藏」跟着变
 */
export function MessageActionMenu({ target, group, userId, menu, onReact, onClose }: {
  target: LongPressTarget;
  group: boolean;
  userId: number;
  menu: (msg: Msg, body: MsgBody, own: boolean) => readonly MenuEntry[];
  onReact: (msg: Msg, symbol: string) => void;
  onClose: () => void;
}) {
  const { theme } = useUnistyles();
  const { width: screenWidth } = useWindowDimensions();
  const actions = useMsgActions();
  const { anchor, info, msg, body } = target;
  const own = info.isOwn;
  // 订阅收藏状态：查到后重画，菜单重新读当时的状态
  useMessengerState((s) => s.favorites[msg.id]);

  useEffect(() => {
    actions?.checkFavorite(msg.id).catch(() => {});
  }, [actions, msg.id]);

  const sections = toSections(menu(msg, body, own));

  // 与气泡对齐：自己的消息贴右，别人的贴左（群里让出头像列）
  const avatarColumn = group && !own ? theme.size.avatar.md + theme.spacing.sm : 0;
  const inset = own ? screenWidth - anchor.x - anchor.width + theme.spacing.page : anchor.x + theme.spacing.page + avatarColumn;
  const mine = reactions(msg, userId).filter((reaction) => reaction.mine).map((reaction) => reaction.symbol);

  return (
    <ActionMenu
      request={{
        anchor,
        align: own ? 'right' : 'left',
        inset,
        sections,
        preview: <MessagePreview info={info} msg={msg} />,
        reactions: {
          emojis: quickReactions(),
          all: EMOJIS,
          mine,
          onPick: (symbol) => {
            rememberReaction(symbol);
            onReact(msg, symbol);
          },
        },
      }}
      onClose={onClose}
    />
  );
}
