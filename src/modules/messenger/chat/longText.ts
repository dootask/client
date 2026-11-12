import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { textBlocks, type Block } from '../../../sync/messenger/body';
import { useSession } from '../../session';
import { useMsgActions } from '../hooks';

/** App：推入长文阅读页（网页由气泡底部的「查看详情」在新标签页打开） */
export function openLongText(msgId: number) {
  router.push({ pathname: '/msg-detail/[msgId]', params: { msgId } });
}

/** 长文的全文块；null 为加载中 */
export function useLongBlocks(msgId: number): { blocks: Block[] | null; failed: boolean } {
  const actions = useMsgActions();
  const userId = useSession((s) => s.user?.userid ?? 0);
  const server = useSession((s) => s.server);
  const [blocks, setBlocks] = useState<Block[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!actions) return;
    let alive = true;
    actions
      .longText(msgId)
      .then(({ md, text }) => alive && setBlocks(textBlocks(text, md, { userId, origin: `${server}/` })))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [actions, msgId, userId, server]);
  return { blocks, failed };
}
