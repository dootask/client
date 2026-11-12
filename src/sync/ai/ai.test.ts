import { describe, expect, it } from 'vitest';

import { repairMarkdownTail, splitTaskLists } from './markdown';
import { isTerminal, PartsBuilder, phaseOf } from './protocol';
import { aiBody, rendersAsAi } from './timeline';

const rich = (markdown: string) => [{ t: 'p' as const, runs: [{ text: markdown }] }];

describe('PartsBuilder', () => {
  it('把事件归约成思考、工具、正文', () => {
    const builder = new PartsBuilder();
    builder.apply({ type: 'REASONING_START', messageId: 'r1', timestamp: 1 });
    builder.apply({ type: 'REASONING_MESSAGE_CONTENT', messageId: 'r1', delta: '想' });
    builder.apply({ type: 'REASONING_END', messageId: 'r1', timestamp: 2 });
    builder.apply({ type: 'TOOL_CALL_START', toolCallId: 't1', toolCallName: 'search' });
    builder.apply({ type: 'TOOL_CALL_ARGS', toolCallId: 't1', delta: '{"q":"a"}' });
    builder.apply({ type: 'TOOL_CALL_RESULT', toolCallId: 't1', content: 'ok' });
    builder.apply({ type: 'TEXT_MESSAGE_CONTENT', messageId: 'm1', delta: '你' });
    builder.apply({ type: 'TEXT_MESSAGE_CONTENT', messageId: 'm1', delta: '好' });
    expect(builder.parts).toEqual([
      { type: 'reasoning', id: 'r1', text: '想', started_at: 1, ended_at: 2 },
      { type: 'tool', id: 't1', name: 'search', title: 'search', args: '{"q":"a"}', status: 'done', result: 'ok', started_at: undefined },
      { type: 'text', id: 'm1', text: '你好' },
    ]);
  });

  it('等待确认的中断加确认块，恢复时写回结果', () => {
    const builder = new PartsBuilder();
    const interrupt = { type: 'RUN_FINISHED', outcome: { type: 'interrupt', interrupts: [{ id: 'c1', reason: 'confirmation', message: '删除？', metadata: { risk: 'danger' } }] } };
    builder.apply(interrupt);
    expect(phaseOf(interrupt)).toBe('waiting_confirm');
    expect(isTerminal(interrupt)).toBe(false);
    builder.apply({ type: 'RUN_STARTED', input: { resume: [{ interruptId: 'c1', payload: { approved: true } }] } });
    expect(builder.parts[0]).toMatchObject({ type: 'confirm', id: 'c1', status: 'approved', summary: '删除？', risk: 'danger' });
    expect(isTerminal({ type: 'RUN_FINISHED' })).toBe(true);
    expect(phaseOf({ type: 'RUN_ERROR', code: 'cancelled' })).toBe('cancelled');
  });
});

describe('aiBody', () => {
  it('结束的回复：思考收进执行过程组，正文成块', () => {
    const body = aiBody(
      { status: 'done', initiator: 1, parts: [{ type: 'reasoning', id: 'r', text: '第一行\n第二行' }, { type: 'text', id: 'm', text: '答案' }] },
      '答案',
      1,
      rich,
    );
    expect(body.status).toBe('done');
    expect(body.mine).toBe(true);
    expect(body.blocks.map((block) => block.t)).toEqual(['process', 'text']);
    const process = body.blocks[0]!;
    expect(process.t === 'process' && process.live).toBe(false);
    expect(process.t === 'process' && process.items[0]!.summary).toBe('第一行');
  });

  it('进行中以事件流内容为准，queued 当作进行中', () => {
    const body = aiBody({ status: 'queued', parts: [], live: { parts: [{ type: 'text', id: 'm', text: '**加' }], phase: '' } }, '...', 2, rich);
    expect(body.status).toBe('running');
    expect(body.mine).toBe(false);
    expect(body.blocks).toEqual([{ t: 'text', key: 'text:m:0', blocks: rich('**加**') }]);
  });

  it('早期回复：卡片替换正文里的降级内容', () => {
    const ai = { status: 'done', parts: [{ type: 'card' as const, id: 'c', card: 'task_list', data: { tasks: [{ id: 5, name: '任务' }] }, fallback: 'FB' }] };
    expect(rendersAsAi(ai, '前 FB 后')).toBe(false);
    const body = aiBody(ai, '前 FB 后', 0, rich);
    expect(body.blocks.map((block) => (block.t === 'card' ? block.card : block.t))).toEqual(['text', 'tasks', 'text']);
  });
});

describe('markdown', () => {
  it('修补末尾没写完的语法', () => {
    expect(repairMarkdownTail('a **b')).toBe('a **b**');
    expect(repairMarkdownTail('```js\ncode')).toBe('```js\ncode\n```');
    expect(repairMarkdownTail('看 [链接](http://x')).toBe('看 链接');
  });

  it('任务链接列表切成任务段，带标题', () => {
    const text = '**待办**\n- [甲](dootask://task/1) — 备注\n- [乙](dootask://task/2/1)\n结尾';
    expect(splitTaskLists(text, false)).toEqual([
      { type: 'tasks', title: '待办', tasks: [{ id: 1, name: '甲', note: '备注' }, { id: 2, name: '乙', note: '' }] },
      { type: 'markdown', text: '结尾' },
    ]);
  });
});
