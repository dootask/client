/** 一条服务器推送事件（text/event-stream） */
export interface SseEvent {
  event: string;
  data: string;
  id: string;
}

/**
 * text/event-stream 分帧：喂进任意切开的文本块，按空行切出完整事件交给 onEvent。
 * 同 EventSource：data 多行用换行连起来，没写 event 的为 message，id 沿用上一条
 */
export function createSseParser(onEvent: (event: SseEvent) => void) {
  let buffer = '';
  let event = '';
  let data: string[] = [];
  let lastId = '';

  function line(text: string) {
    if (text === '') {
      if (data.length) onEvent({ event: event || 'message', data: data.join('\n'), id: lastId });
      event = '';
      data = [];
      return;
    }
    if (text.startsWith(':')) return;
    const colon = text.indexOf(':');
    const field = colon < 0 ? text : text.slice(0, colon);
    let value = colon < 0 ? '' : text.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1);
    if (field === 'event') event = value;
    else if (field === 'data') data.push(value);
    else if (field === 'id' && !value.includes('\0')) lastId = value;
  }

  // 上一块以 \r 结尾：这一块开头的 \n 和它是同一个换行
  let afterCr = false;
  return (chunk: string) => {
    if (afterCr && chunk.startsWith('\n')) chunk = chunk.slice(1);
    afterCr = chunk.endsWith('\r');
    buffer += chunk;
    const lines = buffer.split(/\r\n|\r|\n/);
    // 最后一段可能还没收完整，留到下一块
    buffer = lines.pop() ?? '';
    for (const text of lines) line(text);
  };
}
