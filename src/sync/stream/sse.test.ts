import { describe, expect, it } from 'vitest';

import { createSseParser, type SseEvent } from './sse';

function parse(chunks: string[]) {
  const events: SseEvent[] = [];
  const feed = createSseParser((e) => events.push(e));
  chunks.forEach(feed);
  return events;
}

describe('createSseParser', () => {
  it('按空行切事件，带 event、id', () => {
    expect(parse(['id: 5\nevent: append\ndata: {"content":"你"}\n\n'])).toEqual([{ event: 'append', data: '{"content":"你"}', id: '5' }]);
  });

  it('跨块拼接、多行 data、注释行', () => {
    expect(parse([': ping\nevent: re', 'place\ndata: a\nda', 'ta: b\n', '\n'])).toEqual([{ event: 'replace', data: 'a\nb', id: '' }]);
  });

  it('\\r\\n 跨块不多切出空行；id 沿用上一条', () => {
    expect(parse(['id: 1\r\nevent: append\r\ndata: x\r', '\n\r\nevent: done\r\ndata: \r\n\r\n'])).toEqual([
      { event: 'append', data: 'x', id: '1' },
      { event: 'done', data: '', id: '1' },
    ]);
  });

  it('没写 event 的是 message；没有 data 的不派发', () => {
    expect(parse(['event: done\n\ndata: hi\n\n'])).toEqual([{ event: 'message', data: 'hi', id: '' }]);
  });
});
