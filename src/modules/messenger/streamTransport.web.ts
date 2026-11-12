import type { OpenSse } from '../../sync/stream/msgStreams';

/** 网页直接用 EventSource；断线不自动重连，由调用方决定是否续传 */
export const openSse: OpenSse = (url, onEvent, onEnd) => {
  const source = new EventSource(url);
  const forward = (event: Event) => {
    const e = event as MessageEvent<string>;
    onEvent({ event: e.type, data: e.data, id: e.lastEventId });
  };
  for (const type of ['message', 'append', 'replace', 'done']) source.addEventListener(type, forward);
  source.onerror = () => {
    source.close();
    onEnd();
  };
  return () => source.close();
};
