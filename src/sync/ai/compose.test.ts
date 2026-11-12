import { describe, expect, it } from 'vitest';

import type { AssistantMessage } from '../api/assistant';
import { buildComposeSystem, composeTurns, partsText } from './compose';

const message = (id: number, role: AssistantMessage['role']): AssistantMessage => ({
  id, conversation_id: 1, role, parts: [{ type: 'text', text: `m${id}` }], status: 'done',
});
const context = (system: string) => system.slice(system.indexOf('## 会话信息'));
const options = {
  language: '简体中文', name: '项目讨论', type: 'group', members: [], recent: [], draft: '',
} satisfies Parameters<typeof buildComposeSystem>[0];

describe('composeTurns', () => {
  it('空历史或只有 assistant 时没有轮次', () => {
    expect(composeTurns([])).toEqual([]);
    expect(composeTurns([message(1, 'assistant'), message(2, 'assistant')])).toEqual([]);
  });

  it('忽略开头的 assistant，后续回复归到最近的 user，保持输入顺序', () => {
    const user1 = Object.freeze(message(10, 'user'));
    const assistant1 = Object.freeze(message(11, 'assistant'));
    const user2 = Object.freeze(message(3, 'user'));
    const assistant2 = Object.freeze(message(4, 'assistant'));
    const messages = Object.freeze([message(9, 'assistant'), user1, assistant1, user2, assistant2]);
    const turns = composeTurns(messages);
    expect(turns).toEqual([{ user: user1, assistant: assistant1 }, { user: user2, assistant: assistant2 }]);
    expect(turns[0]!.user).toBe(user1);
    expect(turns[0]!.assistant).toBe(assistant1);
    expect(messages).toHaveLength(5);
    expect(user1).not.toHaveProperty('assistant');
  });

  it('连续 user 和末尾等待回复的 user 保留为独立轮次', () => {
    const user1 = message(1, 'user');
    const user2 = message(2, 'user');
    const assistant = message(3, 'assistant');
    const user3 = message(4, 'user');
    expect(composeTurns([user1, user2, assistant, user3])).toEqual([
      { user: user1 }, { user: user2, assistant }, { user: user3 },
    ]);
  });

  it('同一轮有多次 assistant（重新生成）时选择最后一次回复', () => {
    const user = message(1, 'user');
    const old = message(2, 'assistant');
    const latest = message(3, 'assistant');
    const nextUser = message(4, 'user');
    expect(composeTurns([user, old, latest, nextUser])).toEqual([{ user, assistant: latest }, { user: nextUser }]);
  });
});

describe('partsText', () => {
  it('只按原顺序拼文本，不加分隔符，保留 Markdown 与空白', () => {
    const parts: AssistantMessage['parts'] = [
      { type: 'text', text: '**你好** ' },
      { type: 'reasoning', text: '不应泄漏的思考' },
      { type: 'tool', name: 'search', result: '不应拼入的工具结果' },
      { type: 'step', items: [{ content: '计划' }] },
      { type: 'confirm', summary: '确认内容' },
      { type: 'card', fallback: '卡片降级文本', data: { text: '卡片内容' } },
      { type: 'image', path: '/image.png', url: 'https://s.example/image.png' },
      { type: 'text', text: '\n下一行' },
    ];
    const before = structuredClone(parts);
    expect(partsText(parts)).toBe('**你好** \n下一行');
    expect(parts).toEqual(before);
  });

  it('空列表、没有文本和缺少 text 的文本 part 都按空串处理', () => {
    expect(partsText([])).toBe('');
    expect(partsText([{ type: 'reasoning', text: '思考' }, { type: 'image' }])).toBe('');
    expect(partsText([{ type: 'text' }, { type: 'text', text: '' }, { type: 'text', text: '答案' }, { type: 'text' }])).toBe('答案');
  });
});

describe('buildComposeSystem', () => {
  it.each(['简体中文', 'English', '日本語'])('使用 %s 的语言策略与直接可发送的输出约束', (language) => {
    const system = buildComposeSystem({ ...options, language });
    expect(system).toContain(`默认使用 ${language} 输出。`);
    expect(system).toContain(`即使上下文或引用包含其他语言，也保持 ${language} 输出。`);
    expect(system).toContain('仅当我明确指定其他语言时，才切换到该语言。');
    expect(system).toContain('不要输出代码块或 JSON');
    expect(system).toContain('仅返回可直接发送的消息内容');
    expect(system).toContain('禁止添加额外说明或引导语');
    expect(system).toContain('{{SYSTEM_OPTIONAL_PROMPTS}}');
    expect(system.endsWith('\n----\n请根据以上信息，结合以下用户输入的内容生成消息：')).toBe(true);
  });

  it('按顺序包含会话、成员、最近消息、引用与去空白后的草稿上下文', () => {
    const system = buildComposeSystem({
      ...options, category: '项目', members: [' 张三 ', '李四'],
      recent: [{ sender: '张三', summary: '确认排期' }, { sender: '李四', summary: '已确认' }],
      quote: '周五交付', draft: ' \n收到，按计划推进。\t ',
    });
    expect(context(system)).toBe([
      '## 会话信息', '名称：项目讨论', '类型：群聊', '分类：项目',
      '## 会话成员', '张三，李四', '## 最近消息', '- 张三：确认排期', '- 李四：已确认',
      '## 引用消息', '周五交付', '## 当前草稿', '收到，按计划推进。',
      '----', '请根据以上信息，结合以下用户输入的内容生成消息：',
    ].join('\n'));
  });

  it.each([
    ['group', '群聊'], ['user', '单聊'], ['', '单聊'], ['other', '单聊'],
  ])('会话类型 %s 显示为 %s', (type, label) => {
    expect(buildComposeSystem({ ...options, type })).toContain(`类型：${label}`);
  });

  it.each([undefined, null, ''])('分类为 %s 且没有有效上下文时省略可选分段', (category) => {
    const system = buildComposeSystem({
      ...options, category, members: [' ', '\t\n'], recent: [{ sender: '张三', summary: ' \n\t ' }], quote: '', draft: ' \t\n ',
    });
    expect(context(system)).toBe([
      '## 会话信息', '名称：项目讨论', '类型：群聊',
      '----', '请根据以上信息，结合以下用户输入的内容生成消息：',
    ].join('\n'));
  });

  it.each([59, 60, 61])('名称和分类长 %i 时最多保留 60 字', (length) => {
    const name = '名'.repeat(length);
    const category = '类'.repeat(length);
    const lines = context(buildComposeSystem({ ...options, name, category })).split('\n');
    expect(lines[1]).toBe(`名称：${'名'.repeat(Math.min(length, 60))}`);
    expect(lines[3]).toBe(`分类：${'类'.repeat(Math.min(length, 60))}`);
  });

  it.each([29, 30, 31])('成员名长 %i 时去两端空白并最多保留 30 字', (length) => {
    const system = buildComposeSystem({ ...options, members: [` \t${'人'.repeat(length)}\n `] });
    expect(system.split('## 会话成员\n')[1]!.split('\n')[0]).toBe('人'.repeat(Math.min(length, 30)));
  });

  it('成员先规范化和去重、去空，再取前十人，不改变输入', () => {
    const prefix = '人'.repeat(30);
    const members = Object.freeze([
      '', ' \n ', ' 张三 ', '张三', `${prefix}甲`, `${prefix}乙`,
      ...Array.from({ length: 12 }, (_, i) => `成员${i + 1}`),
    ]);
    const before = [...members];
    const system = buildComposeSystem({ ...options, members });
    expect(system.split('## 会话成员\n')[1]!.split('\n')[0]).toBe(['张三', prefix, ...Array.from({ length: 8 }, (_, i) => `成员${i + 1}`)].join('，'));
    expect(members).toEqual(before);
  });

  it('最近消息先忽略空白摘要，再取最后十五条，保持发送者与原顺序', () => {
    const recent = Object.freeze([
      ...Array.from({ length: 17 }, (_, i) => Object.freeze({ sender: `发送者${i}`, summary: `消息${i}` })),
      ...Array.from({ length: 20 }, () => Object.freeze({ sender: '空消息', summary: ' \t\n ' })),
    ]);
    const before = [...recent];
    const system = buildComposeSystem({ ...options, recent });
    expect(system.split('## 最近消息\n')[1]!.split('\n----')[0]).toBe(
      Array.from({ length: 15 }, (_, i) => `- 发送者${i + 2}：消息${i + 2}`).join('\n'),
    );
    expect(recent).toEqual(before);
  });

  it.each([299, 300, 301])('摘要和引用长 %i 时最多保留 300 字', (length) => {
    const system = buildComposeSystem({
      ...options, recent: [{ sender: '张三', summary: '摘'.repeat(length) }], quote: '引'.repeat(length),
    });
    expect(system.split('## 最近消息\n')[1]!.split('\n')[0]).toBe(`- 张三：${'摘'.repeat(Math.min(length, 300))}`);
    expect(system.split('## 引用消息\n')[1]!.split('\n')[0]).toBe('引'.repeat(Math.min(length, 300)));
  });

  it.each([499, 500, 501])('草稿长 %i 时先 trim 再最多保留 500 字', (length) => {
    const system = buildComposeSystem({ ...options, draft: ` \t\n${'稿'.repeat(length)}\n ` });
    expect(system.split('## 当前草稿\n')[1]!.split('\n')[0]).toBe('稿'.repeat(Math.min(length, 500)));
  });

  it('最近消息摘要只用于空白过滤，不剥掉有效摘要的空白或换行', () => {
    const summary = '  **重点**\n下一行  ';
    expect(buildComposeSystem({ ...options, recent: [{ sender: '张三', summary }] })).toContain(`- 张三：${summary}\n----`);
  });
});
