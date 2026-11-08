import { useEffect, useEffectEvent, useRef } from 'react';
import { View } from 'react-native';

import type { EmbedViewProps } from './types';
import { useEmbedHost } from './useEmbedHost';

/** Web / 桌面：iframe 承载嵌入页，只认嵌入页来源的消息，发出的消息也只投给这个来源 */
export function EmbedView(props: EmbedViewProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const receive = useEmbedHost(props, (text, origin) => frame.current?.contentWindow?.postMessage(text, origin));
  const onMessage = useEffectEvent((event: MessageEvent) => {
    if (event.source === frame.current?.contentWindow) receive(event.data, event.origin);
  });
  useEffect(() => {
    const listener = (event: MessageEvent) => onMessage(event);
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, []);
  return (
    <View style={props.style}>
      <iframe ref={frame} src={props.url} title={props.url} style={FRAME} />
    </View>
  );
}

const FRAME = { border: 0, width: '100%', height: '100%', display: 'block' } as const;
