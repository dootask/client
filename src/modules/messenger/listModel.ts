import type { SearchItem } from '../../sync/api/dialog';
import { compareDialog, type DialogCategory, dialogNum, dialogUnread, inCategory, isListed, type StoredDialog, toUnix } from '../../sync/messenger';
import { htmlToLine } from '../../sync/messenger/preview';

/** 列表顶部的分类：全部、各类会话、标注（列被标注的消息） */
export type ListCategory = '' | Exclude<DialogCategory, 'mention'> | 'mention' | 'mark';

export const CATEGORIES: readonly ListCategory[] = ['', 'project', 'task', 'user', 'group', 'bot', 'mark', 'mention'];

export interface ListInput {
  dialogs: Record<number, StoredDialog>;
  drafts: Record<number, string>;
  openId: number;
  aiHidden: boolean;
  /** 当前秒 */
  now: number;
}

const hasText = (html: string | undefined) => !!html && htmlToLine(html.replace(/<img[^>]*>/gi, 'x')) !== '';

/** 会话最后一条里能搜的文字（同旧前端：文本、文件 / 会议名、服务端摘要） */
function lastMsgText(d: StoredDialog): string {
  const last = d.last_msg;
  if (!last) return '';
  const msg = (last.msg ?? {}) as Record<string, unknown>;
  const pick = (v: unknown) => (typeof v === 'string' ? v : '');
  switch (last.type) {
    case 'text':
      return htmlToLine(pick(msg.text));
    case 'meeting':
    case 'file':
      return pick(msg.name);
    case 'preview':
      return pick(msg.preview);
    default:
      return '';
  }
}

export function matchesKey(d: StoredDialog, key: string): boolean {
  const k = key.toLowerCase();
  return `${d.name ?? ''} ${d.pinyin ?? ''} ${lastMsgText(d)}`.toLowerCase().includes(k);
}

/** 列表里显示的会话 id，按 R11 排好；有搜索词时按名称、拼音、最后消息过滤并忽略分类 */
export function listedIds(input: ListInput, category: ListCategory, key: string): number[] {
  const ctx = { now: input.now, openId: input.openId, aiHidden: input.aiHidden };
  const hasDraft = (id: number) => hasText(input.drafts[id]);
  const list: StoredDialog[] = [];
  for (const d of Object.values(input.dialogs)) {
    if (!isListed(d, ctx)) continue;
    if (key) {
      if (!matchesKey(d, key)) continue;
    } else if (category && category !== 'mark' && !inCategory(d, category)) continue;
    list.push(d);
  }
  return list.sort((a, b) => compareDialog(a, b, hasDraft)).map((d) => d.id);
}

/** 搜索结果（服务端）里不在本地匹配中的那些，同旧前端：联系人按 userid、会话按最后一条消息去重 */
export function extraResults(local: readonly StoredDialog[], remote: readonly SearchItem[], aiHidden: boolean): SearchItem[] {
  const msgIds = new Set<number>();
  const userIds = new Set<number>();
  for (const d of local) {
    if (d.last_msg) msgIds.add(d.last_msg.id);
    if (d.dialog_user) userIds.add(d.dialog_user.userid);
  }
  const out: SearchItem[] = [];
  for (const item of remote) {
    if (aiHidden && item.type === 'user' && item.bot && /^ai-[^@]+@bot\.system$/.test(item.email ?? '')) continue;
    if (typeof item.id === 'string') {
      const uid = item.dialog_user?.userid;
      if (uid !== undefined && !userIds.has(uid)) out.push(item);
    } else if (!item.last_msg || !msgIds.has(item.last_msg.id)) out.push(item);
  }
  return out;
}

/** 列表里的时间分级（docs/ui-spec.md 第 7 节）：今天只显示时分，昨天，今年显示月日，跨年显示年月日；具体格式由界面按语言排 */
export type ListTime = { kind: 'today' | 'yesterday' | 'thisYear' | 'older'; date: Date } | null;

export function listTime(lastAt: string | null | undefined, nowMs: number): ListTime {
  const sec = toUnix(lastAt);
  if (!sec) return null;
  const date = new Date(sec * 1000);
  const now = new Date(nowMs);
  const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(date, now)) return { kind: 'today', date };
  if (sameDay(date, new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1))) return { kind: 'yesterday', date };
  return { kind: date.getFullYear() === now.getFullYear() ? 'thisYear' : 'older', date };
}

/** 再点一次「消息」Tab 时跳到的会话：从当前之后找第一个有未读（含 @、标记未读）的，没有就找待办，再没有就找免打扰里的未读；找到末尾从头再来 */
export function nextUnreadId(ids: readonly number[], dialogs: Record<number, StoredDialog>, afterId: number): number {
  const start = ids.indexOf(afterId) + 1;
  const ordered = [...ids.slice(start), ...ids.slice(0, start)];
  const tests: ((d: StoredDialog) => boolean)[] = [
    (d) => dialogNum(d) > 0,
    (d) => (d.todo_num ?? 0) > 0,
    (d) => dialogUnread(d, true) > 0,
  ];
  for (const test of tests) {
    const hit = ordered.find((id) => dialogs[id] && test(dialogs[id]));
    if (hit !== undefined) return hit;
  }
  return 0;
}
