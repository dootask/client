import { describe, expect, it } from 'vitest';

import * as assistant from '../api/assistant';
import { setup } from '../api/fakeFetch';
import type { AiPart } from './protocol';
import { modelLabel, parseModelGroups, pickModelId } from './models';

const json = (value: unknown) => JSON.stringify(value);

describe('parseModelGroups', () => {
  it('兼容 JSON 字段别名、数字 ID、换行格式与标签回退', () => {
    const config = parseModelGroups({
      openai_models: json([
        { id: ' gpt-4 ', name: ' GPT-4 ' },
        { value: 'gpt-mini', label: 'Mini' },
        { id: 42, name: '' },
        { id: 'fallback' },
      ]),
      deepseek_models: ' chat | Chat \r\n\n reasoner | Reasoner \n bare \n | invalid',
      unrelated: 'ignored',
    });
    expect(config.groups.map((group) => group.type)).toEqual(['openai', 'deepseek']);
    expect(config.groups[0]).toEqual({
      type: 'openai', label: 'ChatGPT', defaultModel: '', options: [
        { id: 'openai:gpt-4', type: 'openai', value: 'gpt-4', label: 'GPT-4' },
        { id: 'openai:gpt-mini', type: 'openai', value: 'gpt-mini', label: 'Mini' },
        { id: 'openai:42', type: 'openai', value: '42', label: '42' },
        { id: 'openai:fallback', type: 'openai', value: 'fallback', label: 'fallback' },
      ],
    });
    expect(config.groups[1]!.options.map((option) => [option.value, option.label])).toEqual([
      ['chat', 'Chat'], ['reasoner', 'Reasoner'], ['bare', 'bare'],
    ]);
    for (const group of config.groups) {
      for (const option of group.options) expect(config.map[option.id]).toBe(option);
    }
  });

  it('隐藏模型不可选，全隐藏的组不返回', () => {
    const config = parseModelGroups({
      openai_models: json([{ id: 'hidden', hidden: true }, { id: 'also-hidden', hidden: 1 }, { id: 'visible', hidden: false }]),
      openai_model: 'hidden',
      claude_models: json([{ id: 'hidden', hidden: true }]),
    });
    expect(config.groups.map((group) => group.type)).toEqual(['openai']);
    expect(Object.keys(config.map)).toEqual(['openai:visible']);
    expect(pickModelId(config, 'openai:hidden', 'claude:hidden')).toBe('openai:visible');
  });

  it('按旧版服务商顺序排列，未知服务商按标签排在最后', () => {
    const order = ['dooai', 'openai', 'claude', 'deepseek', 'gemini', 'grok', 'ollama', 'zhipu', 'qianwen', 'wenxin'];
    const config = parseModelGroups({
      zebra_models: 'z', alpha_models: 'a',
      ...Object.fromEntries([...order].reverse().map((type) => [`${type}_models`, 'm'])),
    });
    expect(config.groups.map((group) => group.type)).toEqual([...order, 'alpha', 'zebra']);
    expect(config.groups.find((group) => group.type === 'zhipu')!.label).toBe('zhipu');
  });

  it('由调用方提供服务商显示名，且不改变输入配置', () => {
    const data = Object.freeze({ zhipu_models: 'glm|GLM', qianwen_models: 'qwen', wenxin_models: 'ernie', dooai_models: 'doo' });
    const labels = Object.freeze({ zhipu: '智谱清言', qianwen: '通义千问', wenxin: '文心一言', dooai: 'Custom Doo' });
    const config = parseModelGroups(data, labels);
    expect(config.groups.map((group) => group.label)).toEqual(['Custom Doo', '智谱清言', '通义千问', '文心一言']);
    expect(data.zhipu_models).toBe('glm|GLM');
    expect(labels.dooai).toBe('Custom Doo');
  });

  it('忽略空值、非字符串、坏 JSON 和不合法条目', () => {
    expect(parseModelGroups({
      dooai_models: null,
      openai_models: 123,
      claude_models: [{ id: 'not-a-string' }],
      deepseek_models: '[broken',
      gemini_models: '',
      grok_models: ' \n | name ',
      ollama_models: json([null, 1, 'string', [], {}, { id: {} }, { id: true }, { id: '' }]),
      zhipu_models: '[]',
      _models: 'empty-provider',
      qianwen_model: 'no-options',
    })).toEqual({ groups: [], map: {} });
    expect(parseModelGroups({})).toEqual({ groups: [], map: {} });
  });
});

describe('pickModelId', () => {
  const config = parseModelGroups({
    deepseek_models: 'chat\nreasoner', deepseek_model: 'reasoner',
    openai_models: 'first\ndefault', openai_model: 'default',
  });

  it.each([
    ['openai:first', 'deepseek:chat', 'openai:first'],
    ['missing', 'deepseek:chat', 'deepseek:chat'],
    ['', 'deepseek:chat', 'deepseek:chat'],
    ['missing', 'missing', 'openai:default'],
    ['', '', 'openai:default'],
    ['toString', 'constructor', 'openai:default'],
  ])('当前 %s，缓存 %s，选出 %s', (current, cached, expected) => {
    expect(pickModelId(config, current, cached)).toBe(expected);
  });

  it('跳过不匹配默认值，查找后续组的默认模型', () => {
    const config = parseModelGroups({
      dooai_models: 'first', dooai_model: 'missing',
      openai_models: 'one\ntwo', openai_model: 'two',
    });
    expect(pickModelId(config)).toBe('openai:two');
  });

  it('无匹配默认值取第一个模型，无模型返回空', () => {
    expect(pickModelId(parseModelGroups({ openai_models: 'one\ntwo', openai_model: {} }))).toBe('openai:one');
    expect(pickModelId(parseModelGroups({}), 'old', 'cached')).toBe('');
  });
});

describe('modelLabel', () => {
  it('按组顺序查找名称，未知或空名称原样返回', () => {
    const config = parseModelGroups({ deepseek_models: 'shared|Second', openai_models: 'shared|First\nmini|Mini' });
    expect(modelLabel(config, 'shared')).toBe('First');
    expect(modelLabel(config, 'mini')).toBe('Mini');
    expect(modelLabel(config, 'unknown')).toBe('unknown');
    expect(modelLabel(config, '')).toBe('');
  });
});

const message = {
  id: 2, conversation_id: 1, role: 'assistant', parts: [{ type: 'text', text: 'answer' }], status: 'done',
  run_id: null, model: null, error: null, feedback: null, created_at: null,
};
const conversationData = { conversation: { id: 1 }, messages: [message], has_more: false, run: null };
const composeResult = {
  conversation: { id: 1 }, user_message: { ...message, id: 1, role: 'user' }, message,
  run: { events_url: '/events?token=abc' },
};
const success = (data: unknown) => ({ ret: 1, msg: 'success', data });

describe('assistant compose API', () => {
  it('models 返回未知字段记录，但拒绝非记录响应', async () => {
    const data = { openai_models: 'gpt|GPT', openai_model: 'gpt', extra: { kept: true } };
    const { client, calls } = setup([success(data), success([])]);
    expect(await assistant.models(client)).toEqual(data);
    expect(calls[0]!.url).toBe('https://demo.example.com/api/assistant/models');
    await expect(assistant.models(client)).rejects.toMatchObject({ kind: 'invalid' });
  });

  it('打开 compose/message 会话，正确保留首次打开的 null', async () => {
    const empty = { conversation: null, messages: [], run: null };
    const { client, calls } = setup([success(empty)]);
    expect(await assistant.conversationOpen(client, '123')).toEqual(empty);
    const url = new URL(calls[0]!.url);
    expect(url.pathname).toBe('/api/assistant/conversation/open');
    expect(Object.fromEntries(url.searchParams)).toEqual({ kind: 'compose', scope: 'message', scope_ref: '123' });
    expect(calls[0]!.init.method).toBe('GET');
  });

  it('消息分页只在传入游标时带 before_id', async () => {
    const { client, calls } = setup([success(conversationData), success(conversationData)]);
    expect(await assistant.conversationMessages(client, 1)).toEqual(conversationData);
    await assistant.conversationMessages(client, 1, 2);
    expect(Object.fromEntries(new URL(calls[0]!.url).searchParams)).toEqual({ conversation_id: '1' });
    expect(Object.fromEntries(new URL(calls[1]!.url).searchParams)).toEqual({ conversation_id: '1', before_id: '2' });
  });

  it('sendCompose 与 regenerate 使用新助手接口，原样提交参数', async () => {
    const { client, calls } = setup([success(composeResult), success({ ...composeResult, run: null })]);
    const params = { scope_ref: '123', conversation_id: 1, model_type: 'openai', model_name: 'gpt', text: 'draft', images: ['/image.png'], system: 'prompt', locale: 'en' };
    expect(await assistant.sendCompose(client, params)).toEqual(composeResult);
    expect(calls[0]!.url).toBe('https://demo.example.com/api/assistant/send');
    expect(calls[0]!.init.method).toBe('POST');
    expect(JSON.parse(calls[0]!.init.body as string)).toEqual({ ...params, kind: 'compose', scope: 'message' });
    const regenerateParams = { message_id: 2, model_type: 'openai', model_name: 'gpt', system: 'prompt', locale: 'en' };
    expect((await assistant.regenerate(client, regenerateParams)).run).toBeNull();
    expect(calls[1]!.url).toBe('https://demo.example.com/api/assistant/regenerate');
    expect(calls[1]!.init.method).toBe('POST');
    expect(JSON.parse(calls[1]!.init.body as string)).toEqual(regenerateParams);
  });

  it('新会话发送可省略 conversation_id 和 images，重新生成可修改文本', async () => {
    const { client, calls } = setup([success(composeResult), success(composeResult)]);
    await assistant.sendCompose(client, { scope_ref: '123', model_type: 'openai', model_name: 'gpt', text: 'draft', system: '', locale: 'en' });
    expect(JSON.parse(calls[0]!.init.body as string)).not.toHaveProperty('conversation_id');
    expect(JSON.parse(calls[0]!.init.body as string)).not.toHaveProperty('images');
    await assistant.regenerate(client, { message_id: 2, model_type: 'openai', model_name: 'gpt', text: 'edited', system: '', locale: 'en' });
    expect(JSON.parse(calls[1]!.init.body as string).text).toBe('edited');
  });

  it('助手流用 message_id，结束时返回 null，机器人仍用 dialog_msg_id', async () => {
    const { client, calls } = setup([success(composeResult.run), success(null), success(composeResult.run)]);
    expect(await assistant.assistantRunStream(client, 2)).toBe('/events?token=abc');
    expect(await assistant.assistantRunStream(client, 2)).toBeNull();
    expect(await assistant.runStream(client, 3)).toBe('/events?token=abc');
    expect(Object.fromEntries(new URL(calls[0]!.url).searchParams)).toEqual({ message_id: '2' });
    expect(Object.fromEntries(new URL(calls[2]!.url).searchParams)).toEqual({ dialog_msg_id: '3' });
  });

  it('上传返回路径和地址，反馈返回更新后的消息', async () => {
    const image = { path: '/image.png', url: 'https://demo.example.com/image.png' };
    const { client, calls } = setup([success(image), success({ ...message, feedback: 'like' })]);
    expect(await assistant.upload(client, 'data:image/png;base64,abc')).toEqual(image);
    expect(calls[0]!.url).toBe('https://demo.example.com/api/assistant/upload');
    expect(calls[0]!.init.method).toBe('POST');
    expect(JSON.parse(calls[0]!.init.body as string)).toEqual({ image64: 'data:image/png;base64,abc' });
    expect((await assistant.feedback(client, 2, 'like')).feedback).toBe('like');
    expect(calls[1]!.url).toBe('https://demo.example.com/api/assistant/message/feedback');
    expect(calls[1]!.init.method).toBe('POST');
    expect(JSON.parse(calls[1]!.init.body as string)).toEqual({ message_id: 2, feedback: 'like' });
  });

  it.each(['dislike', ''] as const)('反馈允许 %s', async (feedback) => {
    const { client, calls } = setup([success({ ...message, feedback })]);
    await assistant.feedback(client, 2, feedback);
    expect(JSON.parse(calls[0]!.init.body as string)).toEqual({ message_id: 2, feedback });
  });

  it('按协议校验六种 parts，保留工具与卡片的任意数据和额外字段', async () => {
    const parts: AiPart[] = [
      { type: 'text', id: 't', text: 'answer' },
      { type: 'reasoning', started_at: 1, ended_at: 2 },
      { type: 'tool', id: 'tool', name: 'search', title: 'Search', args: { q: 'a' }, result: [1], status: 'done', risk: 'low', started_at: 1 },
      { type: 'step', items: [{ content: 'plan', status: 'done' }, {}] },
      { type: 'confirm', status: 'approved', summary: 'confirm', risk: 'low', targets: ['target', { id: 1, name: 'one' }, { id: 'two', title: 'Two' }], by: 3 },
      { type: 'card', card: 'tasks', title: 'Tasks', data: { tasks: [] }, state: [1], fallback: 'fallback' },
    ];
    const { client } = setup([success({ ...conversationData, messages: [{ ...message, parts, extra: 'kept' }] })]);
    const result = await assistant.conversationMessages(client, 1);
    expect(result.messages[0]!.parts).toEqual(parts);
    expect(result.messages[0]!.extra).toBe('kept');
  });

  it('允许省略 nullish 消息字段和 parts 内可选字段', async () => {
    const minimal = { id: 2, conversation_id: 1, role: 'assistant', parts: [{ type: 'text' }], status: 'running' };
    const { client } = setup([success({ ...conversationData, messages: [minimal] })]);
    expect((await assistant.conversationMessages(client, 1)).messages).toEqual([minimal]);
  });

  it.each([
    { role: 'system' }, { id: '2' }, { conversation_id: '1' }, { status: null }, { run_id: 1 },
    { model: {} }, { error: {} }, { feedback: 1 }, { created_at: 1 }, { parts: [{}] },
    { parts: [{ type: 'other' }] }, { parts: [{ type: 'text', text: 1 }] },
    { parts: [{ type: 'reasoning', ended_at: '2' }] }, { parts: [{ type: 'tool', name: 1 }] },
    { parts: [{ type: 'step', items: [{ content: 1 }] }] },
    { parts: [{ type: 'confirm', targets: [{ id: false }] }] },
    { parts: [{ type: 'card', fallback: 1 }] },
  ])('拒绝不符合消息协议的字段 %j', async (patch) => {
    const { client } = setup([success({ ...conversationData, messages: [{ ...message, ...patch }] })]);
    await expect(assistant.conversationMessages(client, 1)).rejects.toMatchObject({ kind: 'invalid' });
  });

  it('发送必须返回非空会话，流与上传响应必须有合法字段', async () => {
    const { client } = setup([success({ ...composeResult, conversation: null }), success({ events_url: 1 }), success({ path: '/image.png' })]);
    await expect(assistant.sendCompose(client, { scope_ref: '123', model_type: 'openai', model_name: 'gpt', text: 'draft', system: '', locale: 'en' })).rejects.toMatchObject({ kind: 'invalid' });
    await expect(assistant.assistantRunStream(client, 2)).rejects.toMatchObject({ kind: 'invalid' });
    await expect(assistant.upload(client, 'image')).rejects.toMatchObject({ kind: 'invalid' });
  });
});
