import type { Msg } from '../../../sync/api/dialog';
import { atLatest, toUnix, type OutboxItem, type UploadItem, type WithdrawnMsg } from '../../../sync/messenger';
import type { ChatMessage } from '../../../ui/chat';

/**
 * 聊天列表的行：服务器消息、发送队列里的文字和文件、自己刚撤回的占位，合成一个按时间倒序的列表
 */

export type RowData =
  | { kind: 'msg'; msg: Msg }
  | { kind: 'pending'; item: OutboxItem }
  | { kind: 'upload'; item: UploadItem }
  | { kind: 'withdrawn'; item: WithdrawnMsg };
export type ChatRow = ChatMessage<RowData>;

/** 系统消息的作者：不和任何消息连成一组，也不算自己发的 */
export const SYSTEM_AUTHOR = 'system';
const SYSTEM_TYPES = new Set(['tag', 'top', 'todo', 'notice', 'withdraw']);

/** 同一人连续发的消息相隔不超过这么久就连成一组（只在第一条显示名字、头像） */
const CHAIN_GAP = 3 * 60_000;

export interface RowSources {
  /** 消息窗口，按 id 倒序 */
  list: readonly Msg[];
  outbox: readonly OutboxItem[];
  uploads: readonly UploadItem[];
  withdrawn: readonly WithdrawnMsg[];
  sentKeys: Readonly<Record<number, string>>;
  dialogId: number;
  userId: number;
}

/**
 * 行对象按数据对象缓存：数据没变的行每次重建列表都拿到同一个对象，行组件的 memo 才管用。
 * 消息、发送队列项、撤回占位在数据层都是不可变的，变了就是新对象
 */
const rowCache = new WeakMap<object, ChatRow>();

function cachedRow(source: object, make: () => ChatRow, key?: string): ChatRow {
  const hit = rowCache.get(source);
  if (hit && hit.key === key) return hit;
  const row = make();
  rowCache.set(source, row);
  return row;
}

export function msgRow(msg: Msg, key?: string): ChatRow {
  return cachedRow(
    msg,
    () => ({
      id: String(msg.id),
      key,
      createdAt: toUnix(msg.created_at) * 1000,
      authorId: SYSTEM_TYPES.has(msg.type) ? SYSTEM_AUTHOR : String(msg.userid),
      data: { kind: 'msg', msg },
    }),
    key,
  );
}

export function buildRows({ list, outbox, uploads, withdrawn, sentKeys, dialogId, userId }: RowSources): ChatRow[] {
  const latest = atLatest(list);
  const newest = list[0]?.id ?? 0;
  const oldest = list[list.length - 1]?.id ?? 0;
  // 撤回占位只放进窗口覆盖的范围；窗口在最新一端时比最新一条还新的也放
  const holes = withdrawn
    .filter((w) => w.dialog_id === dialogId && w.id >= oldest && (latest || w.id <= newest))
    .sort((a, b) => b.id - a.id);

  const rows: ChatRow[] = [];
  if (latest) {
    const me = String(userId);
    // 文字和文件两个队列各自按入队先后，合在一起按入队时间排（稳定排序，同一时刻的保持先后），新的在前
    type Queued = Extract<RowData, { kind: 'pending' | 'upload' }>;
    const queued: Queued[] = [
      ...outbox.filter((item) => item.dialog_id === dialogId).map((item) => ({ kind: 'pending' as const, item })),
      ...uploads.filter((item) => item.dialog_id === dialogId).map((item) => ({ kind: 'upload' as const, item })),
    ].sort((a, b) => a.item.queuedAt - b.item.queuedAt);
    for (let i = queued.length - 1; i >= 0; i--) {
      const data = queued[i]!;
      rows.push(cachedRow(data.item, () => ({ id: data.item.localId, createdAt: data.item.queuedAt, authorId: me, data })));
    }
  }
  let h = 0;
  for (const msg of list) {
    while (h < holes.length && holes[h]!.id > msg.id) rows.push(withdrawnRow(holes[h++]!));
    // 撤回请求还没回来、原消息还在：先画原消息，占位等它被删掉再顶上
    if (h < holes.length && holes[h]!.id === msg.id) h++;
    rows.push(msgRow(msg, sentKeys[msg.id]));
  }
  while (h < holes.length) rows.push(withdrawnRow(holes[h++]!));
  return rows;
}

function withdrawnRow(item: WithdrawnMsg): ChatRow {
  // 占位当系统提示画，不和前后的消息连成一组
  return cachedRow(item, () => ({ id: String(item.id), createdAt: toUnix(item.created_at) * 1000, authorId: SYSTEM_AUTHOR, data: { kind: 'withdrawn', item } }));
}

/** 两条相邻消息是否连成一组：同一个人、同一天、相隔不超过 3 分钟 */
export function chained(a: ChatRow | undefined, b: ChatRow | undefined): boolean {
  if (!a || !b || a.authorId !== b.authorId || a.authorId === SYSTEM_AUTHOR) return false;
  return Math.abs(a.createdAt - b.createdAt) <= CHAIN_GAP && new Date(a.createdAt).toDateString() === new Date(b.createdAt).toDateString();
}

/** 系统类的行（居中提示，不画气泡） */
export function isSystemRow(row: ChatRow): boolean {
  return row.authorId === SYSTEM_AUTHOR;
}
