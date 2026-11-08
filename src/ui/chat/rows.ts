import type { ChatMessage } from './types';

/** 列表认行的键 */
export const keyOf = (message: ChatMessage<unknown>) => message.key ?? message.id;

/** 两个时间是否同一天（本机时区） */
export function sameDay(a: number, b: number) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}
