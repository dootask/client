/**
 * 聊天机器人回复（msg.ai）的 parts 与 Run 事件归约，对照主仓库 utils/ai-agent/protocol.js（与插件 engine/events.py 的 PartsBuilder 一致）
 */

export interface PlanItem {
  content?: string;
  status?: string;
}

export interface ConfirmTarget {
  id?: number | string;
  name?: string;
  title?: string;
}

/** 回复里的一块：思考、工具、计划、确认、卡片、正文；字段按插件原样保存，都可能缺 */
export type AiPart =
  | { type: 'text'; id?: string; text?: string }
  | { type: 'reasoning'; id?: string; text?: string; started_at?: number; ended_at?: number }
  | { type: 'tool'; id?: string; name?: string; title?: string; args?: unknown; status?: string; result?: unknown; risk?: string; started_at?: number }
  | { type: 'step'; id?: string; items?: PlanItem[] }
  | { type: 'confirm'; id?: string; status?: string; summary?: string; risk?: string; targets?: (string | ConfirmTarget)[]; by?: number }
  | { type: 'card'; id?: string; card?: string; title?: string; data?: unknown; state?: unknown; fallback?: string };

/** 运行状态：queued、running、waiting_confirm 为进行中，done、error、cancelled 为结束 */
export const ACTIVE_STATUS = ['queued', 'running', 'waiting_confirm'];

/** 服务端返回的 msg.ai */
export interface AiInfo {
  run_id?: string;
  initiator?: number;
  status?: string;
  parts?: AiPart[];
  error?: string | { message?: string };
  /** 本端叠加的事件流实时内容（不是服务端字段，见 runs.ts） */
  live?: { parts: AiPart[]; phase: string };
}

/** 工具结果最多留多少字（同插件） */
const TOOL_RESULT_PREVIEW = 600;
const ACTIVITY_PLAN = 'plan';
const ACTIVITY_CARD = 'dootask.card';
const ERROR_CANCELLED = 'cancelled';

type Event = Record<string, unknown> & { type?: string };
type Writable = AiPart & Record<string, unknown>;

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});
const str = (v: unknown) => (typeof v === 'string' ? v : '');
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/** 把 AG-UI 事件逐条归约成 parts */
export class PartsBuilder {
  parts: Writable[] = [];

  private find(type: AiPart['type'], id: unknown): Writable | undefined {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const part = this.parts[i]!;
      if (part.type === type && part.id === id) return part;
    }
    return undefined;
  }

  private ensure(type: 'text' | 'reasoning', id: unknown): Writable {
    const found = this.find(type, id);
    if (found) return found;
    const part: Writable = { type, id: str(id), text: '' };
    this.parts.push(part);
    return part;
  }

  apply(event: Event) {
    switch (event.type) {
      case 'TEXT_MESSAGE_START':
        this.parts.push({ type: 'text', id: str(event.messageId), text: '' });
        break;
      case 'TEXT_MESSAGE_CONTENT': {
        const part = this.ensure('text', event.messageId);
        part.text = str(part.text) + str(event.delta);
        break;
      }
      case 'REASONING_START':
        this.parts.push({ type: 'reasoning', id: str(event.messageId), text: '', started_at: Number(event.timestamp) || undefined });
        break;
      case 'REASONING_END': {
        const part = this.find('reasoning', event.messageId);
        if (part) part.ended_at = Number(event.timestamp) || Date.now();
        break;
      }
      case 'REASONING_MESSAGE_CONTENT': {
        const part = this.ensure('reasoning', event.messageId);
        part.text = str(part.text) + str(event.delta);
        break;
      }
      case 'TOOL_CALL_START':
        this.parts.push({
          type: 'tool',
          id: str(event.toolCallId),
          name: str(event.toolCallName),
          title: str(event.toolCallName),
          args: '',
          status: 'running',
          started_at: Number(event.timestamp) || undefined,
        });
        break;
      case 'TOOL_CALL_ARGS': {
        const part = this.find('tool', event.toolCallId);
        if (part) part.args = str(part.args) + str(event.delta);
        break;
      }
      case 'TOOL_CALL_END': {
        const part = this.find('tool', event.toolCallId);
        const meta = obj(event.metadata);
        if (part && meta.title) part.title = str(meta.title);
        if (part && meta.risk) part.risk = str(meta.risk);
        break;
      }
      case 'TOOL_CALL_RESULT': {
        const part = this.find('tool', event.toolCallId);
        if (part) {
          part.status = obj(event.metadata).error ? 'error' : 'done';
          part.result = String(event.content ?? '').slice(0, TOOL_RESULT_PREVIEW);
        }
        break;
      }
      case 'ACTIVITY_SNAPSHOT': {
        const content = obj(event.content);
        if (event.activityType === ACTIVITY_PLAN) {
          const part = this.find('step', event.messageId);
          const items = list(content.todos) as PlanItem[];
          if (part) part.items = items;
          else this.parts.push({ type: 'step', id: str(event.messageId), items });
        } else if (event.activityType === ACTIVITY_CARD) {
          const part = this.find('card', event.messageId);
          if (part) Object.assign(part, content);
          else this.parts.push({ type: 'card', ...content, id: str(event.messageId) });
        }
        break;
      }
      case 'RUN_STARTED':
        // 确认后恢复的新一段：input.resume 带各确认项的结果
        for (const raw of list(obj(event.input).resume)) {
          const item = obj(raw);
          const part = this.find('confirm', item.interruptId);
          if (!part) continue;
          const meta = obj(item.metadata);
          part.status = item.status === 'cancelled' ? 'rejected' : str(meta.status) || (obj(item.payload).approved ? 'approved' : 'rejected');
          if (meta.by) part.by = Number(meta.by);
        }
        break;
      case 'RUN_FINISHED':
        if (isInterrupt(event)) {
          for (const raw of list(obj(event.outcome).interrupts)) {
            const item = obj(raw);
            if (item.reason !== 'confirmation' || this.find('confirm', item.id)) continue;
            const meta = obj(item.metadata);
            this.parts.push({
              type: 'confirm',
              id: str(item.id),
              status: 'pending',
              summary: str(item.message),
              risk: str(meta.risk),
              targets: list(meta.targets) as ConfirmTarget[],
            });
          }
        }
        break;
      case 'RUN_ERROR':
        for (const part of this.parts) if (part.type === 'tool' && part.status === 'running') part.status = 'error';
        break;
    }
  }
}

/** RUN_FINISHED 是否为等待确认的中断 */
export function isInterrupt(event: Event) {
  return event.type === 'RUN_FINISHED' && obj(event.outcome).type === 'interrupt';
}

/** 事件 → 运行阶段：running（首段或确认后恢复）/ waiting_confirm / cancelled；其余为 null */
export function phaseOf(event: Event): string | null {
  if (event.type === 'RUN_STARTED') return 'running';
  if (isInterrupt(event)) return 'waiting_confirm';
  if (event.type === 'RUN_ERROR' && event.code === ERROR_CANCELLED) return 'cancelled';
  return null;
}

/** 事件是否结束了这一次连接：等待确认的中断不算，之后接着订阅 */
export function isTerminal(event: Event) {
  return event.type === 'RUN_ERROR' || (event.type === 'RUN_FINISHED' && !isInterrupt(event));
}
