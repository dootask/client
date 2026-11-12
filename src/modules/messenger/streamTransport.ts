import { fetch } from 'expo/fetch';

import { createSseParser } from '../../sync/stream/sse';
import type { OpenSse } from '../../sync/stream/msgStreams';

/** App 没有 EventSource：用 expo/fetch 读流式响应体，自己按 text/event-stream 分帧 */
export const openSse: OpenSse = (url, onEvent, onEnd) => {
  const controller = new AbortController();
  const feed = createSseParser(onEvent);
  (async () => {
    const res = await fetch(url, { headers: { Accept: 'text/event-stream' }, signal: controller.signal });
    const reader = res.body?.getReader();
    if (!res.ok || !reader) return;
    const decoder = new TextDecoder();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      feed(decoder.decode(value, { stream: true }));
    }
  })()
    .catch(() => {})
    .finally(() => {
      if (!controller.signal.aborted) onEnd();
    });
  return () => controller.abort();
};
