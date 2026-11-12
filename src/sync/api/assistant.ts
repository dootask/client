import { z } from 'zod';

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
