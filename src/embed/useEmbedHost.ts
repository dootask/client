import { useEffect, useState } from 'react';

import { createEmbedHost, type EmbedEvent } from './host';
import type { EmbedViewProps } from './types';

/**
 * 两端 EmbedView 共用：建宿主控制器（网址变了才重建，重新等 ready），会话变化时下发。
 * post 由各端提供，只能读 ref，不能依赖渲染时的值。返回收消息的函数：校验后转给对应回调
 */
export function useEmbedHost({ url, session, onNavigate, onTitle, onClose, onChanged }: EmbedViewProps, post: (text: string, targetOrigin: string) => void) {
  const [state, setState] = useState(() => ({ url, host: createEmbedHost({ url, session, post }) }));
  let host = state.host;
  if (state.url !== url) {
    host = createEmbedHost({ url, session, post });
    setState({ url, host });
  }
  useEffect(() => host.update(session), [host, session]);

  const dispatch = (event: EmbedEvent) => {
    switch (event.type) {
      case 'navigate':
        return onNavigate?.(event.payload.path);
      case 'title':
        return onTitle?.(event.payload.title);
      case 'close':
        return onClose?.();
      case 'changed':
        return onChanged?.(event.payload.scope, event.payload.id);
    }
  };
  return (raw: unknown, from: string | null) => {
    const event = host.receive(raw, from);
    if (event) dispatch(event);
  };
}
