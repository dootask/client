import { z } from 'zod';

import type { AiPart } from '../ai/protocol';
import type { ApiClient } from './client';
import { requestParsed } from './schema';

/**
 * 聊天机器人回复（msg.ai）的操作（主仓库 AssistantController）：订阅事件流、停止、确认、卡片动作。
 * 停止、确认、卡片动作只有发起人能做
 */

const runStreamSchema = z.looseObject({ events_url: z.string() }).nullable();

/** 进行中回复的事件流地址（相对地址，带订阅凭证）；已结束返回 null */
export async function runStream(client: ApiClient, dialogMsgId: number) {
  const { data } = await requestParsed(client, 'assistant/run/stream', runStreamSchema, { data: { dialog_msg_id: dialogMsgId } });
  return data?.events_url || null;
}

export async function cancel(client: ApiClient, dialogMsgId: number) {
  await client.request('assistant/cancel', { method: 'post', data: { dialog_msg_id: dialogMsgId } });
}

/** 确认或拒绝执行一项操作 */
export async function resume(client: ApiClient, dialogMsgId: number, confirmId: string, approved: boolean) {
  await client.request('assistant/resume', { method: 'post', data: { dialog_msg_id: dialogMsgId, confirm_id: confirmId, approved: approved ? 1 : 0 } });
}

/** 结果卡片的动作（如取消批量预览），结果写回卡片后随消息更新推送 */
export async function cardAction(client: ApiClient, dialogMsgId: number, cardId: string, action: string) {
  await client.request('assistant/card/action', { method: 'post', data: { dialog_msg_id: dialogMsgId, card_id: cardId, action } });
}

/** 输入区 AI 生成使用持久化助手会话，不走聊天消息生成接口 */
const partSchema: z.ZodType<AiPart> = z.discriminatedUnion('type', [
  z.looseObject({ type: z.literal('text'), id: z.string().optional(), text: z.string().optional() }),
  z.looseObject({
    type: z.literal('reasoning'),
    id: z.string().optional(),
    text: z.string().optional(),
    started_at: z.number().optional(),
    ended_at: z.number().optional(),
  }),
  z.looseObject({
    type: z.literal('tool'),
    id: z.string().optional(),
    name: z.string().optional(),
    title: z.string().optional(),
    args: z.unknown().optional(),
    status: z.string().optional(),
    result: z.unknown().optional(),
    risk: z.string().optional(),
    started_at: z.number().optional(),
  }),
  z.looseObject({
    type: z.literal('step'),
    id: z.string().optional(),
    items: z.array(z.looseObject({ content: z.string().optional(), status: z.string().optional() })).optional(),
  }),
  z.looseObject({
    type: z.literal('confirm'),
    id: z.string().optional(),
    status: z.string().optional(),
    summary: z.string().optional(),
    risk: z.string().optional(),
    targets: z.array(z.union([
      z.string(),
      z.looseObject({ id: z.union([z.number(), z.string()]).optional(), name: z.string().optional(), title: z.string().optional() }),
    ])).optional(),
    by: z.number().optional(),
  }),
  z.looseObject({
    type: z.literal('card'),
    id: z.string().optional(),
    card: z.string().optional(),
    title: z.string().optional(),
    data: z.unknown().optional(),
    state: z.unknown().optional(),
    fallback: z.string().optional(),
  }),
]);

const conversationSchema = z.looseObject({ id: z.number() });
const messageSchema = z.looseObject({
  id: z.number(),
  conversation_id: z.number(),
  role: z.enum(['user', 'assistant']),
  parts: z.array(z.union([partSchema, z.looseObject({ type: z.literal('image'), path: z.string().optional(), url: z.string().optional() })])),
  status: z.string(),
  run_id: z.string().nullish(),
  model: z.string().nullish(),
  error: z.string().nullish(),
  feedback: z.string().nullish(),
  created_at: z.string().nullish(),
});
const conversationDataSchema = z.looseObject({
  conversation: conversationSchema.nullable(),
  messages: z.array(messageSchema),
  has_more: z.boolean().optional(),
  run: runStreamSchema,
});
const composeResultSchema = z.looseObject({
  conversation: conversationSchema,
  user_message: messageSchema,
  message: messageSchema,
  run: runStreamSchema,
});

export type AssistantConversation = z.output<typeof conversationSchema>;
export type AssistantMessage = z.output<typeof messageSchema>;
export type AssistantRun = z.output<typeof runStreamSchema>;
export type AssistantConversationData = z.output<typeof conversationDataSchema>;
export type ComposeResult = z.output<typeof composeResultSchema>;

export interface SendComposeParams {
  scope_ref: string;
  conversation_id?: number;
  model_type: string;
  model_name: string;
  text: string;
  images?: string[];
  system: string;
  locale: string;
}

export interface RegenerateParams {
  message_id: number;
  model_type: string;
  model_name: string;
  text?: string;
  system: string;
  locale: string;
}

export async function models(client: ApiClient): Promise<Record<string, unknown>> {
  const { data } = await requestParsed(client, 'assistant/models', z.record(z.string(), z.unknown()));
  return data;
}

/** 同一个聊天会话复用生成历史，首次打开可能没有助手会话 */
export async function conversationOpen(client: ApiClient, dialogId: string): Promise<AssistantConversationData> {
  const { data } = await requestParsed(client, 'assistant/conversation/open', conversationDataSchema, {
    data: { kind: 'compose', scope: 'message', scope_ref: dialogId },
  });
  return data;
}

export async function conversationMessages(client: ApiClient, conversationId: number, beforeId?: number): Promise<AssistantConversationData> {
  const { data } = await requestParsed(client, 'assistant/conversation/messages', conversationDataSchema, {
    data: { conversation_id: conversationId, ...(beforeId === undefined ? {} : { before_id: beforeId }) },
  });
  return data;
}

export async function sendCompose(client: ApiClient, params: SendComposeParams): Promise<ComposeResult> {
  const { data } = await requestParsed(client, 'assistant/send', composeResultSchema, {
    method: 'post', data: { ...params, kind: 'compose', scope: 'message' },
  });
  return data;
}

export async function regenerate(client: ApiClient, params: RegenerateParams): Promise<ComposeResult> {
  const { data } = await requestParsed(client, 'assistant/regenerate', composeResultSchema, { method: 'post', data: { ...params } });
  return data;
}

/** 助手消息的事件流与聊天机器人不同，必须传 message_id */
export async function assistantRunStream(client: ApiClient, messageId: number): Promise<string | null> {
  // ApiClient 把顶层 data:null 归一成 {}，只在此接口还原结束态，不放宽其他响应校验
  const schema = z.preprocess((value) => (
    value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0 ? null : value
  ), runStreamSchema);
  const { data } = await requestParsed(client, 'assistant/run/stream', schema, { data: { message_id: messageId } });
  return data?.events_url || null;
}

export async function upload(client: ApiClient, image64: string): Promise<{ path: string; url: string }> {
  const { data } = await requestParsed(client, 'assistant/upload', z.looseObject({ path: z.string(), url: z.string() }), {
    method: 'post', data: { image64 },
  });
  return data;
}

export async function feedback(client: ApiClient, messageId: number, value: 'like' | 'dislike' | ''): Promise<AssistantMessage> {
  const { data } = await requestParsed(client, 'assistant/message/feedback', messageSchema, {
    method: 'post', data: { message_id: messageId, feedback: value },
  });
  return data;
}
