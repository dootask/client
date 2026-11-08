import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';

import type { ChatMessage } from './types';

/**
 * 离开底部后新到了几条：离开时记下当时最新的一条，之后排在它前面的都算新消息。
 * 数据不含最新消息时没有「新消息」可数；补齐到最新的那一刻，以当时最新的一条为准
 */
export function useNewMessages<T>(messages: readonly ChatMessage<T>[], hasNewer: boolean | undefined) {
  const [anchorId, setAnchorId] = useState<string | null>(null);
  const messagesRef = useRef(messages);
  useLayoutEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  const onAtBottomChange = useCallback((atBottom: boolean) => {
    setAnchorId(atBottom ? null : (messagesRef.current[0]?.id ?? null));
  }, []);
  const [prevHasNewer, setPrevHasNewer] = useState(hasNewer);
  if (hasNewer !== prevHasNewer) {
    setPrevHasNewer(hasNewer);
    if (!hasNewer && anchorId !== null) setAnchorId(messages[0]?.id ?? null);
  }
  const newCount = useMemo(() => {
    if (!anchorId || hasNewer) return 0;
    const index = messages.findIndex((m) => m.id === anchorId);
    return index < 0 ? 0 : index;
  }, [anchorId, hasNewer, messages]);
  /** 离开了底部，或数据不含最新消息：显示回到底部按钮 */
  const away = anchorId !== null || !!hasNewer;
  return { onAtBottomChange, newCount, away };
}
