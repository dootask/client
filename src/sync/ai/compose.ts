import type { AssistantMessage } from '../api/assistant';

export interface ComposeTurn { user: AssistantMessage; assistant?: AssistantMessage }

export function composeTurns(messages: readonly AssistantMessage[]): ComposeTurn[] {
  const turns: ComposeTurn[] = [];
  for (const message of messages) {
    if (message.role === 'user') turns.push({ user: message });
    else if (turns.length) turns[turns.length - 1]!.assistant = message;
  }
  return turns;
}

export function partsText(parts: AssistantMessage['parts']): string {
  return parts.filter((part) => part.type === 'text').map((part) => part.text ?? '').join('');
}

export function buildComposeSystem({ language, name, type, category, members, recent, quote, draft }: {
  language: string; name: string; type: string; category?: string | null; members: readonly string[]; recent: readonly { sender: string; summary: string }[]; quote?: string; draft: string;
}): string {
  const prompt = `你是一名沟通助手，帮助用户编写即时消息。

写作要求：
1. 生成简短、得体的消息，语气符合业务沟通场景
2. 可使用 Markdown 基础格式（加粗、列表），但不要输出代码块或 JSON
3. 如有引用内容或草稿，自然呼应相关要点
4. 默认生成简短消息（一到几句话），仅在用户明确要求时才写长

输出规范：
- 仅返回可直接发送的消息内容
- 禁止添加额外说明或引导语

输出语言策略：
- 默认使用 ${language} 输出。
- 即使上下文或引用包含其他语言，也保持 ${language} 输出。
- 仅当我明确指定其他语言时，才切换到该语言。

{{SYSTEM_OPTIONAL_PROMPTS}}`;
  const context = ['## 会话信息', `名称：${name.slice(0, 60)}`, `类型：${type === 'group' ? '群聊' : '单聊'}`];
  if (category) context.push(`分类：${category.slice(0, 60)}`);
  const names = [...new Set(members.map((member) => member.trim().slice(0, 30)).filter(Boolean))].slice(0, 10);
  if (names.length) context.push('## 会话成员', names.join('，'));
  const messages = recent.filter((item) => item.summary.trim()).slice(-15);
  if (messages.length) context.push('## 最近消息', ...messages.map(({ sender, summary }) => `- ${sender}：${summary.slice(0, 300)}`));
  if (quote) context.push('## 引用消息', quote.slice(0, 300));
  if (draft.trim()) context.push('## 当前草稿', draft.trim().slice(0, 500));
  return `${prompt}\n\n${context.join('\n')}\n----\n请根据以上信息，结合以下用户输入的内容生成消息：`;
}
