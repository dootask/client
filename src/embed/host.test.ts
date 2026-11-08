import { describe, expect, it } from 'vitest';

import { createEmbedHost, type EmbedSession } from './host';
import { encodeGuestMessage } from './protocol';

const session: EmbedSession = {
  server: 'https://task.example.com',
  token: 'tok',
  theme: 'light',
  language: 'zh',
  user: { userid: 1, nickname: 'A', avatar: '' },
};

function setup(url: string) {
  const sent: { data: { type: string; payload: Record<string, unknown> }; origin: string }[] = [];
  const host = createEmbedHost({ url, session, post: (text, origin) => sent.push({ data: JSON.parse(text), origin }) });
  return { host, sent };
}

const ready = encodeGuestMessage({ type: 'ready' });

describe('createEmbedHost', () => {
  it('ready 之后才下发 init，同源嵌入页带 token', () => {
    const { host, sent } = setup('https://task.example.com/apps/gantt/');
    host.update({ ...session, theme: 'dark' });
    expect(sent).toHaveLength(0);
    expect(host.receive(ready, 'https://task.example.com')).toBeNull();
    expect(sent).toHaveLength(1);
    expect(sent[0].origin).toBe('https://task.example.com');
    expect(sent[0].data.type).toBe('init');
    expect(sent[0].data.payload).toMatchObject({ token: 'tok', theme: 'dark', language: 'zh' });
  });

  it('其他来源的嵌入页不给 token', () => {
    const { host, sent } = setup('https://plugin.other.com/app');
    host.receive(ready, 'https://plugin.other.com');
    expect(sent[0].origin).toBe('https://plugin.other.com');
    expect(sent[0].data.payload).not.toHaveProperty('token');
    expect(sent[0].data.payload).toMatchObject({ server: 'https://task.example.com' });
  });

  it('只认嵌入页来源的消息', () => {
    const { host, sent } = setup('https://task.example.com/apps/x');
    expect(host.receive(ready, 'https://evil.com')).toBeNull();
    expect(host.receive(encodeGuestMessage({ type: 'close' }), null)).toBeNull();
    expect(sent).toHaveLength(0);
    expect(host.receive(encodeGuestMessage({ type: 'close' }), 'https://task.example.com')).toEqual({ type: 'close' });
  });

  it('主题、语言单独下发，token 变化重发 init', () => {
    const { host, sent } = setup('https://task.example.com/x');
    host.receive(ready, 'https://task.example.com');
    host.update({ ...session, theme: 'dark' });
    host.update({ ...session, theme: 'dark', language: 'en' });
    host.update({ ...session, theme: 'dark', language: 'en', token: 'new' });
    host.update({ ...session, theme: 'dark', language: 'en', token: 'new' });
    expect(sent.map((s) => s.data.type)).toEqual(['init', 'theme', 'language', 'init']);
    expect(sent[1].data.payload).toEqual({ theme: 'dark' });
    expect(sent[2].data.payload).toEqual({ language: 'en' });
    expect(sent[3].data.payload).toMatchObject({ token: 'new' });
  });

  it('网址不是 http(s) 时什么都不收发', () => {
    const { host, sent } = setup('javascript:alert(1)');
    expect(host.origin).toBeNull();
    host.receive(ready, null);
    expect(sent).toHaveLength(0);
  });
});
