import { type ComponentRef, useRef } from 'react';
import { WebView } from 'react-native-webview';

import { originOf } from './protocol';
import type { EmbedViewProps } from './types';
import { useEmbedHost } from './useEmbedHost';

/**
 * App：WebView 承载嵌入页。宿主消息注入成页面里的 message 事件，与 iframe 收到的一样，嵌入页一套监听即可；
 * 注入的脚本先核对页面来源，页面跳到别处时不会把消息（含 token）发过去
 */
export function EmbedView(props: EmbedViewProps) {
  const web = useRef<ComponentRef<typeof WebView>>(null);
  const receive = useEmbedHost(props, (text, origin) => {
    const data = JSON.stringify(text);
    const from = JSON.stringify(origin);
    web.current?.injectJavaScript(`if(location.origin===${from})window.dispatchEvent(new MessageEvent('message',{data:${data},origin:${from}}));true;`);
  });
  return (
    <WebView
      ref={web}
      source={{ uri: props.url }}
      onMessage={(event) => receive(event.nativeEvent.data, originOf(event.nativeEvent.url))}
      style={props.style}
    />
  );
}
