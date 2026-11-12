import type { Block } from '../messenger/body/types';
import { splitTaskLists, repairMarkdownTail } from './markdown';
import { ACTIVE_STATUS, type AiInfo, type AiPart, type ConfirmTarget } from './protocol';

/**
 * 聊天机器人回复 → 块时间线，对照主仓库 utils/ai-agent/blocks.js 和 sharedWebViewDialogAi.js 的 timeline：
 * 连续的思考与工具收进一个执行过程组；带确认的工具、计划、卡片、正文各自成块，按发生顺序排列
 */

export type AiRowState = 'running' | 'done' | 'error' | 'confirming' | 'skipped';

/** 执行过程里的一行：思考或工具调用 */
export interface AiRow {
  key: string;
  kind: 'reasoning' | 'tool';
  state: AiRowState;
  /** 工具名 */
  name: string;
  summary: string;
  /** 思考全文，或工具参数 */
  detail: string;
  /** 工具结果 */
  result: string;
}

export interface AiConfirm {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  summary: string;
  targets: string[];
}

export interface AiTaskRow {
  /** 0 是还没写完的待定行（只有名称） */
  id: number;
  name: string;
  note: string;
}

export type AiCard = { t: 'card'; key: string; id: string; title: string } & (
  | { card: 'tasks'; rows: AiTaskRow[] }
  | { card: 'batch'; project: string; column: string; items: { name: string; end: string }[]; status: string; created: { taskId: number; name: string }[] }
  | { card: 'fallback'; blocks: Block[] }
);

export type AiBlock =
  | { t: 'process'; key: string; live: boolean; toolCount: number; failedCount: number; startedAt: number; items: AiRow[] }
  | { t: 'confirm'; key: string; row?: AiRow; risk: boolean; confirm: AiConfirm }
  | { t: 'plan'; key: string; completed: number; finished: boolean; items: { text: string; status: string }[] }
  | { t: 'text'; key: string; blocks: Block[] }
  | AiCard;

export type AiStatus = 'running' | 'waiting_confirm' | 'done' | 'error' | 'cancelled';

/** AI 回复的消息体 */
export interface AiBody {
  kind: 'ai';
  status: AiStatus;
  /** 当前用户是发起人：能停止、确认、操作卡片 */
  mine: boolean;
  error: string;
  blocks: AiBlock[];
}

/** 不单独显示的工具：计划由计划块表达，卡片由卡片块表达 */
const HIDDEN_TOOLS = ['show_card', 'write_todos'];
/** 工具参数、结果过长时截断 */
const DETAIL_LIMIT = 4000;

type Rich = (markdown: string) => Block[];
type Data = Record<string, unknown>;
const obj = (v: unknown): Data => (v && typeof v === 'object' ? (v as Data) : {});
const str = (v: unknown) => (typeof v === 'string' ? v : '');
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/** 运行状态是否进行中 */
export function isActive(status: string | undefined) {
  return ACTIVE_STATUS.includes(status ?? '');
}

/**
 * msg.ai → AI 消息体。服务端仍是进行中时以叠加的事件流内容为准（比消息推送及时），结束后以保存的为准。
 * text 是消息正文：早期没有正文块的回复正文在它里面
 */
export function aiBody(ai: AiInfo, text: string, userId: number, rich: Rich): AiBody {
  const { live } = ai;
  const serverActive = isActive(ai.status);
  const saved = list(ai.parts) as AiPart[];
  const parts = serverActive ? (live?.parts.length ? live.parts : saved) : saved.length ? saved : (live?.parts ?? []);
  let status = (serverActive && live?.phase ? live.phase : ai.status) ?? 'done';
  if (status === 'queued') status = 'running';
  const active = isActive(status);
  const mine = !!userId && ai.initiator === userId;
  const legacy = !active && text !== '...' && !parts.some((part) => part.type === 'text');
  const blocks = legacy ? legacyBlocks(text, parts, rich) : timeline(parts, active, rich);
  const error = status === 'error' ? (typeof ai.error === 'string' ? ai.error : str(ai.error?.message)) : '';
  return { kind: 'ai', status: status as AiStatus, mine, error, blocks };
}

/** 正文是否该交给 aiBody：进行中、有正文块，或正文仍是占位符 */
export function rendersAsAi(ai: AiInfo, text: string) {
  return isActive(ai.status) || text === '...' || list(ai.parts).some((part) => obj(part).type === 'text');
}

/** 正文按 Markdown 显示，任务链接列表就地变成任务卡片；生成中先修补末尾没写完的语法 */
function textBlocks(key: string, text: string, live: boolean, rich: Rich): AiBlock[] {
  const segments = splitTaskLists(text, live);
  return segments.flatMap((segment, index): AiBlock[] => {
    const segmentKey = `${key}:${index}`;
    if (segment.type === 'tasks') return [{ t: 'card', key: segmentKey, id: '', title: segment.title, card: 'tasks', rows: segment.tasks }];
    const value = live && index === segments.length - 1 ? repairMarkdownTail(segment.text) : segment.text;
    return value.trim() ? [{ t: 'text', key: segmentKey, blocks: rich(value) }] : [];
  });
}

function clip(text: string) {
  return text.length > DETAIL_LIMIT ? `${text.slice(0, DETAIL_LIMIT)}…` : text;
}

function parseArgs(args: unknown): unknown {
  if (typeof args !== 'string') return args;
  try {
    return JSON.parse(args);
  } catch {
    return undefined;
  }
}

/** 工具参数：doo 命令拼成命令行，其余为 JSON */
function formatArgs(args: unknown): string {
  if (!args) return '';
  const data = parseArgs(args);
  if (data === undefined) return String(args);
  const cli = obj(data).args;
  if (Array.isArray(cli)) return `doo ${cli.join(' ')}`;
  return JSON.stringify(data, null, 2);
}

/** 工具行的单行描述：doo 命令行，或参数里第一个文本值（搜索词、文件名等） */
function toolSummary(args: unknown): string {
  if (!args) return '';
  const data = parseArgs(args);
  if (data === undefined) return String(args);
  const cli = obj(data).args;
  if (Array.isArray(cli)) return `doo ${cli.join(' ')}`;
  const value = Object.values(obj(data)).find((item): item is string => typeof item === 'string' && !!item.trim());
  return value?.trim() ?? '';
}

type ToolPart = Extract<AiPart, { type: 'tool' }>;
type ConfirmPart = Extract<AiPart, { type: 'confirm' }>;

function toolState(tool: ToolPart, confirm: ConfirmPart | undefined, live: boolean): AiRowState {
  if (confirm?.status === 'pending') return 'confirming';
  if (confirm && (confirm.status === 'rejected' || confirm.status === 'expired')) return 'skipped';
  if (tool.status === 'running') return live ? 'running' : 'error';
  return tool.status === 'error' ? 'error' : 'done';
}

function confirmInfo(part: ConfirmPart): AiConfirm {
  const targets = list(part.targets).slice(0, 10).map((target) => {
    if (typeof target === 'string') return target;
    const { name, title, id } = target as ConfirmTarget;
    return [name || title || '', id ? `#${id}` : ''].filter(Boolean).join(' ') || JSON.stringify(target);
  });
  const status = (['approved', 'rejected', 'expired'] as const).find((s) => s === part.status) ?? 'pending';
  return { id: part.id ?? '', status, summary: part.summary ?? '', targets };
}

/** parts → 时间线 */
function timeline(parts: AiPart[], live: boolean, rich: Rich): AiBlock[] {
  const confirms = new Map<string, ConfirmPart>();
  for (const part of parts) if (part.type === 'confirm' && part.id) confirms.set(part.id, part);
  const toolIds = new Set(parts.flatMap((part) => (part.type === 'tool' && !HIDDEN_TOOLS.includes(part.name ?? '') ? [part.id] : [])));
  const lastIndex = parts.length - 1;
  const blocks: AiBlock[] = [];
  const starts = new Map<AiRow, number>();

  const pushRow = (row: AiRow, startedAt: number | undefined) => {
    if (startedAt) starts.set(row, startedAt);
    const prev = blocks[blocks.length - 1];
    if (prev?.t === 'process') prev.items.push(row);
    else blocks.push({ t: 'process', key: `process:${row.key}`, live: false, toolCount: 0, failedCount: 0, startedAt: 0, items: [row] });
  };

  parts.forEach((part, index) => {
    const key = `${part.type}:${part.id || index}`;
    switch (part.type) {
      case 'reasoning': {
        const text = (part.text ?? '').trim();
        if (!text) break;
        // 新数据按 ended_at 判断是否结束；旧数据只能看是否为最后一块
        const rowLive = live && (part.started_at ? !part.ended_at : index === lastIndex);
        const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
        const summary = (rowLive ? lines[lines.length - 1] : lines[0]) ?? '';
        pushRow({ key, kind: 'reasoning', state: rowLive ? 'running' : 'done', name: '', summary, detail: clip(text), result: '' }, part.started_at);
        break;
      }
      case 'tool': {
        if (HIDDEN_TOOLS.includes(part.name ?? '')) break;
        const confirm = part.id ? confirms.get(part.id) : undefined;
        const result = part.result == null || part.result === '' ? '' : typeof part.result === 'string' ? part.result : JSON.stringify(part.result, null, 2);
        const row: AiRow = {
          key: part.id || key,
          kind: 'tool',
          state: toolState(part, confirm, live),
          name: part.title || part.name || '',
          summary: toolSummary(part.args),
          detail: clip(formatArgs(part.args)),
          result: clip(result),
        };
        if (confirm) blocks.push({ t: 'confirm', key, row, risk: (part.risk || confirm.risk) === 'danger', confirm: confirmInfo(confirm) });
        else pushRow(row, part.started_at);
        break;
      }
      case 'text':
        if (part.text) blocks.push(...textBlocks(key, part.text, live && index === lastIndex, rich));
        break;
      case 'step': {
        const items = list(part.items) as { content?: string; status?: string }[];
        if (!items.length) break;
        const completed = items.filter((item) => item.status === 'completed').length;
        blocks.push({
          t: 'plan',
          key,
          completed,
          finished: completed === items.length,
          items: items.map((item) => ({ text: item.content ?? '', status: item.status ?? 'pending' })),
        });
        break;
      }
      case 'confirm':
        // 找不到对应工具行的确认（旧数据）
        if (!toolIds.has(part.id)) blocks.push({ t: 'confirm', key, risk: part.risk === 'danger', confirm: confirmInfo(part) });
        break;
      case 'card':
        blocks.push(card(key, part, rich));
        break;
    }
  });

  // 执行过程组：生成中且是最后一块时为进行中（默认展开），之后默认收起
  const last = blocks[blocks.length - 1];
  for (const block of blocks) {
    if (block.t !== 'process') continue;
    block.live = live && block === last;
    const tools = block.items.filter((row) => row.kind === 'tool');
    block.toolCount = tools.length;
    block.failedCount = tools.filter((row) => row.state === 'error').length;
    block.startedAt = block.items.map((row) => starts.get(row)).find(Boolean) ?? 0;
  }
  return blocks;
}

/** 早期回复：结果卡片替换正文里对应的降级内容，留在原位置；找不到降级内容的卡片放在末尾 */
function legacyBlocks(text: string, parts: AiPart[], rich: Rich): AiBlock[] {
  const blocks: AiBlock[] = [];
  const tails: AiBlock[] = [];
  let rest = text;
  const pushText = (value: string) => blocks.push(...textBlocks(`text:${blocks.length}`, value.trim(), false, rich));
  parts.forEach((part, index) => {
    if (part.type !== 'card') return;
    const block = card(`card:${part.id || index}`, part, rich);
    const at = part.fallback ? rest.indexOf(part.fallback) : -1;
    if (at === -1) {
      tails.push(block);
      return;
    }
    pushText(rest.slice(0, at));
    blocks.push(block);
    rest = rest.slice(at + part.fallback!.length);
  });
  pushText(rest);
  return [...blocks, ...tails];
}

/** 2026-11-12 08:30:00 → 11-12 08:30 */
function shortTime(value: unknown) {
  const text = str(value);
  return /^\d{4}-(\d\d-\d\d \d\d:\d\d)/.exec(text)?.[1] ?? text;
}

function card(key: string, part: Extract<AiPart, { type: 'card' }>, rich: Rich): AiCard {
  const data = obj(part.data);
  const base = { t: 'card' as const, key, id: part.id ?? '', title: part.title ?? '' };
  switch (part.card) {
    case 'task_list':
      return {
        ...base,
        card: 'tasks',
        rows: list(data.tasks).map((raw) => {
          const task = obj(raw);
          return { id: Number(task.id) || 0, name: str(task.name), note: str(task.note) };
        }),
      };
    case 'batch_preview': {
      const items = list(data.items).map(obj);
      const state = obj(part.state);
      return {
        ...base,
        card: 'batch',
        project: str(data.project_name) || (data.project_id ? `#${String(data.project_id)}` : ''),
        column: str(data.column),
        items: items.map((item) => ({ name: str(item.name), end: item.end_at ? shortTime(item.end_at) : '' })),
        status: str(state.status),
        created: list(state.created).map((raw) => {
          const { index, task_id } = obj(raw);
          const taskId = Number(task_id) || 0;
          return { taskId, name: str(items[Number(index)]?.name) || `#${taskId}` };
        }),
      };
    }
    default:
      return { ...base, card: 'fallback', blocks: rich(part.fallback ?? '') };
  }
}
