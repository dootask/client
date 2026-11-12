import { useEffect, useState } from 'react';

import type { Msg } from '../../../sync/api/dialog';
import { useMessengerState, useMsgActions } from '../hooks';

/** 消息原文：窗口里有就跟着窗口变（编辑、回应），没有时向服务端要一次 */
export function useTopMsg(dialogId: number, msgId: number): Msg | null {
  const actions = useMsgActions();
  const local = useMessengerState((s) => s.windows[dialogId]?.list.find((m) => m.id === msgId));
  const [fetched, setFetched] = useState<Msg | null>(null);
  useEffect(() => {
    if (local || !actions) return;
    let alive = true;
    actions
      .topMsg(dialogId, msgId)
      .then((msg) => alive && setFetched(msg))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [local, actions, dialogId, msgId]);
  return local ?? fetched;
}
