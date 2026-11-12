import { createContext, useContext } from 'react';

import type { Msg } from '../../../../sync/api/dialog';

/**
 * 卡片所在的地方，由气泡提供：
 * - msg：所在消息，卡片上改数据的操作（投票等）要用；合并转发详情等只看不操作的地方没有，这些按钮不显示或不响应
 * - open：卡片上的入口（「参与接龙」、合并转发标题）交给外面打开，同点气泡
 */
export interface CardHost {
  msg: Msg | null;
  open?: () => void;
}

export const CardHostContext = createContext<CardHost>({ msg: null });

export const useCardMsg = () => useContext(CardHostContext).msg;

export const useCardOpen = () => useContext(CardHostContext).open;
