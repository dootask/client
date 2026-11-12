import { describe, expect, it } from 'vitest';

import { messageNotification, type MessageNotificationInput } from './notify';

const input = (patch: Partial<MessageNotificationInput> = {}): MessageNotificationInput => ({
  msg: { dialog_id: 10, userid: 2, type: 'text', msg: { text: '<p>你好</p>' } },
  silence: false,
  userId: 1,
  foreground: true,
  viewingId: 20,
  dialog: { name: '测试会话', type: 'user' },
  senderName: '发送者',
  aiName: 'AI 助手',
  formatPreview: (preview) => `${preview.labels.map((label) => `[${label}]`).join('')}${preview.text}`,
  ...patch,
});

describe('消息通知规则 P2', () => {
  it.each([true, 1] as const)('服务端静默 %s 不通知', (silence) => {
    expect(messageNotification(input({ silence }))).toBeNull();
  });
  it('自己发的消息不通知', () => {
    expect(messageNotification(input({ userId: 2 }))).toBeNull();
  });
  it('前台正在看这个会话不通知', () => {
    expect(messageNotification(input({ viewingId: 10 }))).toBeNull();
  });
  it('前台看别的会话时通知', () => {
    expect(messageNotification(input())).toEqual({ title: '测试会话', body: '你好' });
  });
  it('后台即使打开这个会话也通知', () => {
    expect(messageNotification(input({ foreground: false, viewingId: 10 }))).not.toBeNull();
  });
  it('不因为会话免打扰而忽略服务端非静默的 @ 消息', () => {
    expect(messageNotification(input({ silence: 0 }))).not.toBeNull();
  });
  it('群聊加发送者前缀', () => {
    expect(messageNotification(input({ dialog: { name: '测试群', type: 'group' } }))).toEqual({ title: '测试群', body: '发送者: 你好' });
  });
  it('复用消息预览处理图片、HTML、嵌套消息', () => {
    expect(messageNotification(input({ msg: { dialog_id: 10, userid: 2, type: 'file', msg: { type: 'img' } } }))?.body).toBe('[image]');
    expect(messageNotification(input({ msg: { dialog_id: 10, userid: 2, type: 'tag', msg: { data: { type: 'text', msg: { text: '<p>内容</p>' } } } } }))?.body).toBe('[tag]内容');
  });
  it.each([['智能助手', '智能助手'], ['', 'AI 助手'], [undefined, 'AI 助手']])('AI 用消息昵称 %s 或翻译后的默认名', (nickname, expected) => {
    expect(messageNotification(input({
      dialog: { name: '测试群', type: 'group' },
      msg: { dialog_id: 10, userid: -1, type: 'text', msg: { text: '回答', nickname } },
    }))?.body).toBe(`${expected}: 回答`);
  });
  it('AI 单聊不加前缀', () => {
    expect(messageNotification(input({ msg: { dialog_id: 10, userid: -1, type: 'text', msg: { text: '回答' } } }))?.body).toBe('回答');
  });
});
