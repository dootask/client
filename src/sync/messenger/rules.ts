import type { Dialog, Msg } from '../api/dialog';

/**
 * 消息业务规则（纯函数）。编号对应 docs/m1-features.md 第 1 节，逐条核对过旧前端 store/actions.js 和 messenger.vue。
 */

/** 会话的局部更新：推送、已读返回、置顶返回等都只带部分字段 */
export type DialogPatch = Partial<Dialog> & {
  id: number;
  /** 删除消息后回退最后一条：即使比本地旧也要覆盖 */
  last_force?: boolean;
};

/** 服务器时间字符串转秒；本地时区解析，只用于按天比较的规则 */
export function toUnix(time: string | null | undefined): number {
  if (!time) return 0;
  const ms = new Date(time.replace(' ', 'T')).getTime();
  return Number.isNaN(ms) ? 0 : Math.floor(ms / 1000);
}

/**
 * R4 会话合并（用户态以 user_ms 较新的为准）。本地没有这个会话时只接收完整会话（带 type），局部更新丢弃。
 * isRead：本地是否已经读过这条消息（已读上报还没回来时，服务端给的未读位置可能已过时）
 */
export function mergeDialog(original: Dialog | undefined, patch: DialogPatch, isRead: (msgId: number) => boolean): Dialog | undefined {
  const { last_force: lastForce, ...data } = patch;
  // 会话接口有时带微秒（2026-11-08 19:22:37.000000），消息时间不带；统一到秒才能按字符串比较
  if (data.last_at) data.last_at = data.last_at.slice(0, 19);
  if (!original) return data.type === undefined ? undefined : (data as Dialog);
  if ((data.user_ms ?? Infinity) < (original.user_ms ?? 0)) {
    delete data.unread;
    delete data.unread_one;
    delete data.mention;
    delete data.mention_ids;
    // 旧前端这里会把 user_ms 也覆盖成旧的，下次比较就失准；保留较新的
    delete data.user_at;
    delete data.user_ms;
  }
  if (data.unread_one && isRead(data.unread_one)) delete data.unread_one;
  if (data.mention_ids) data.mention_ids = data.mention_ids.filter((id) => !isRead(id));
  if (!lastForce && data.last_at && original.last_at && data.last_at < original.last_at) {
    delete data.last_at;
    delete data.last_msg;
  }
  return { ...original, ...data };
}

/** R5 新消息成为会话的最后一条 */
export function lastMsgPatch(msg: Msg): DialogPatch {
  const patch: DialogPatch = { id: msg.dialog_id, last_msg: msg, last_at: msg.created_at };
  if (msg.mtype === 'tag') patch.has_tag = true;
  if (msg.mtype === 'todo') patch.has_todo = true;
  if (msg.mtype === 'image') patch.has_image = true;
  if (msg.mtype === 'file') patch.has_file = true;
  if (msg.link) patch.has_link = true;
  return patch;
}

/** R6 会话行显示的数字：未读（免打扰不算）、否则 @ 数、否则手动标记的未读 */
export function dialogNum(d: Dialog): number {
  const unread = d.silence ? 0 : (d.unread ?? 0);
  return unread || d.mention || d.mark_unread || 0;
}

/** R6 未读数；containSilence 为 true 时免打扰会话也算 */
export function dialogUnread(d: Dialog, containSilence: boolean): number {
  const unread = containSilence || !d.silence ? (d.unread ?? 0) : 0;
  return unread || d.mark_unread || 0;
}

export function dialogMention(d: Dialog): number {
  return d.mention ?? 0;
}

/** AI 机器人单聊（App 上架审核时按系统配置隐藏） */
export function isAiBotDialog(d: Dialog): boolean {
  return d.type === 'user' && !!d.bot && /^ai-[^@]+@bot\.system$/.test(d.email ?? '');
}

/** D15 输入区换成提示条的原因：禁言（管理员不受限）优先于对方账号停用 */
export function composerBlock(d: Dialog, isAdmin: boolean): 'muted' | 'disabled' | null {
  if (d.dialog_mute === 'close' && !isAdmin) return 'muted';
  if (d.is_disable) return 'disabled';
  return null;
}

/** B7 本客户端处理的快捷消息：`~` 开头是 AI 会话指令（随 N7），会议和位置签到暂不支持 */
const UNSUPPORTED_QUICK = /^(~|meeting-|locat-)/;

/** B7 输入栏上方要显示的快捷消息 */
export function quickMsgs(d: Dialog): { key: string; label: string }[] {
  return (d.quick_msgs ?? []).filter((item) => item.key && item.label && !UNSUPPORTED_QUICK.test(item.key));
}

export type DialogCategory = 'project' | 'task' | 'user' | 'group' | 'bot' | 'mention';

/** R7 会话属于哪个分类（「全部」「标注」不在这里判断） */
export function inCategory(d: Dialog, category: DialogCategory): boolean {
  switch (category) {
    case 'project':
    case 'task':
      return d.group_type === category;
    case 'user':
      return d.type === 'user' && !d.bot;
    case 'group':
      return d.type === 'group' && d.group_type !== 'project' && d.group_type !== 'task';
    case 'bot':
      return !!d.bot;
    case 'mention':
      return dialogMention(d) > 0;
  }
}

export interface ListContext {
  /** 当前秒 */
  now: number;
  /** 正在看的会话 */
  openId: number;
  /** 是否隐藏 AI 机器人单聊 */
  aiHidden: boolean;
}

const DAY = 86400;

/** R10 会话列表里是否显示 */
export function isListed(d: Dialog, ctx: ListContext): boolean {
  if (ctx.aiHidden && isAiBotDialog(d)) return false;
  if ((d.id > 0 && d.id === ctx.openId) || d.top_at || (d.todo_num ?? 0) > 0 || dialogNum(d) > 0) return true;
  if (d.name === undefined || d.dialog_delete === 1) return false;
  if (d.hide || !d.last_at) return false;
  const info = d.group_info;
  if (d.type === 'group' && (d.group_type === 'project' || d.group_type === 'task') && info) {
    const lastAt = toUnix(d.last_at);
    const expired = (at: string | null | undefined, days: number) => !!at && Math.max(lastAt, toUnix(at)) + days * DAY < ctx.now;
    if (d.group_type === 'task' && expired(info.complete_at, 5)) return false;
    if (expired(info.deleted_at, 2)) return false;
    if (expired(info.archived_at, 3)) return false;
  }
  return true;
}

/** 时间字符串倒序比较；空值排最后 */
function byTimeDesc(a: string | null | undefined, b: string | null | undefined): number {
  if (a === b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a < b ? 1 : -1;
}

/** R11 列表排序：置顶时间 → 待办数 → 有草稿 → 最后消息时间，都倒序 */
export function compareDialog(a: Dialog, b: Dialog, hasDraft: (id: number) => boolean): number {
  if (a.top_at || b.top_at) return byTimeDesc(a.top_at, b.top_at);
  const todoA = a.todo_num ?? 0;
  const todoB = b.todo_num ?? 0;
  if (todoA > 0 || todoB > 0) return todoB - todoA;
  const draftA = hasDraft(a.id) ? 1 : 0;
  const draftB = hasDraft(b.id) ? 1 : 0;
  if (draftA || draftB) return draftB - draftA;
  return byTimeDesc(a.last_at, b.last_at);
}

export interface UnreadTotals {
  /** 未读（不含免打扰） */
  unread: number;
  mention: number;
  todo: number;
  /** R9 App 角标、桌面角标：所有会话的 dialogNum 之和 */
  badge: number;
}

/** R8、R9 汇总，传入的是「可见」的会话（已按 aiHidden 过滤，不按 isListed 过滤） */
export function unreadTotals(dialogs: Iterable<Dialog>): UnreadTotals {
  const totals: UnreadTotals = { unread: 0, mention: 0, todo: 0, badge: 0 };
  for (const d of dialogs) {
    totals.unread += dialogUnread(d, false);
    totals.mention += dialogMention(d);
    totals.todo += d.todo_num ?? 0;
    totals.badge += dialogNum(d);
  }
  return totals;
}

/** R7 各分类的未读（用 dialogNum 累加；@我、标注不显示数字） */
export function categoryUnread(dialogs: Iterable<Dialog>, category: Exclude<DialogCategory, 'mention'>): number {
  let n = 0;
  for (const d of dialogs) if (inCategory(d, category)) n += dialogNum(d);
  return n;
}

/**
 * R8 Tab 红点文字：`12`、`12·@3`、`@3`、`12·待办2`、`@3·待办2`、`待办`（只有 1 个不带数字）。
 * todoLabel 是「待办」的译文
 */
export function badgeText(totals: Pick<UnreadTotals, 'unread' | 'mention' | 'todo'>, todoLabel: string): string {
  const cap = (n: number, max: number) => (n > max ? `${max}+` : n ? String(n) : '');
  const num = cap(totals.unread, 999);
  const mention = cap(totals.mention, 999);
  if (totals.todo > 0) {
    const todo = `${todoLabel}${totals.todo === 1 ? '' : cap(totals.todo, 99)}`;
    if (mention) return `@${mention}·${todo}`;
    if (num) return `${num}·${todo}`;
    return todo;
  }
  if (num) return mention ? `${num}·@${mention}` : num;
  return mention ? `@${mention}` : '';
}

// ---------------------------------------------------------------------------
// 消息窗口：每个会话在内存里只保留一段连续的消息（按 id 倒序），两端用 prev_id / next_id 判断还有没有
// ---------------------------------------------------------------------------

/** R13 单条消息合并：本地已读的保留已读；推送不带两端标记时保留原来的 */
export function mergeMsg(original: Msg | undefined, incoming: Msg): Msg {
  if (!original) return incoming;
  const merged = { ...original, ...incoming };
  if (original.read_at) merged.read_at = original.read_at;
  if (incoming.prev_id === undefined) merged.prev_id = original.prev_id;
  if (incoming.next_id === undefined) merged.next_id = original.next_id;
  return merged;
}

/** 合并若干条消息，结果按 id 倒序 */
export function upsertMsgs(list: readonly Msg[], incoming: readonly Msg[]): Msg[] {
  if (incoming.length === 0) return list as Msg[];
  const map = new Map(list.map((m) => [m.id, m]));
  for (const m of incoming) map.set(m.id, mergeMsg(map.get(m.id), m));
  return [...map.values()].sort((a, b) => b.id - a.id);
}

export function removeMsgs(list: readonly Msg[], ids: readonly number[]): Msg[] {
  const set = new Set(ids);
  return list.filter((m) => !set.has(m.id));
}

/** 窗口最新一端已经是会话的最新消息（新推送可以直接接上） */
export function atLatest(list: readonly Msg[]): boolean {
  return list.length === 0 || !((list[0]!.next_id ?? 0) > 0);
}

/** 窗口更早的一端之前还有消息；prev_id 为 -1 表示有但不知道 id */
export function hasEarlier(list: readonly Msg[]): boolean {
  return list.length > 0 && (list[list.length - 1]!.prev_id ?? 0) !== 0;
}

/** 往更早翻页时 prev_id 参数（取 id ≤ 它的一页） */
export function earlierCursor(list: readonly Msg[]): number {
  const oldest = list[list.length - 1];
  if (!oldest) return 0;
  return (oldest.prev_id ?? 0) > 0 ? oldest.prev_id! : oldest.id - 1;
}

/** 往更新翻页时 next_id 参数（取 id ≥ 它的一页） */
export function newerCursor(list: readonly Msg[]): number {
  const newest = list[0];
  if (!newest) return 0;
  return (newest.next_id ?? 0) > 0 ? newest.next_id! : newest.id + 1;
}

/**
 * R13 拿到最新一页（不带 prev/next/position）。
 * - 和窗口重叠：页内范围以服务器为准（没返回的是服务端删了），更早的保留；
 *   比这页新、但创建时间早于 time 的也是删了的
 * - 不重叠：中间有缺口，窗口换成这一页
 * - 这页已经是全部消息（最旧一条 prev_id=0）：更早的都删掉
 */
export function applyLatestPage(list: readonly Msg[], page: readonly Msg[], time: number): Msg[] {
  const newer = (m: Msg) => toUnix(m.created_at) >= time;
  if (page.length === 0) return list.filter(newer);
  const max = page[0]!.id;
  const oldest = page[page.length - 1]!;
  const min = oldest.id;
  const overlap = list.some((m) => (m.id >= min && m.id <= max) || m.id === oldest.prev_id);
  const keepOlder = overlap && (oldest.prev_id ?? 0) !== 0;
  const kept = list.filter((m) => (m.id > max && newer(m)) || (keepOlder && m.id < min));
  return upsertMsgs(kept, page);
}

/** 往更早翻了一页；空页说明到头了 */
export function applyEarlierPage(list: readonly Msg[], page: readonly Msg[]): Msg[] {
  if (page.length > 0) return upsertMsgs(list, page);
  if (list.length === 0) return [];
  return [...list.slice(0, -1), { ...list[list.length - 1]!, prev_id: 0 }];
}

/** 往更新翻了一页；空页说明到头了 */
export function applyNewerPage(list: readonly Msg[], page: readonly Msg[]): Msg[] {
  if (page.length > 0) return upsertMsgs(list, page);
  if (list.length === 0) return [];
  return [{ ...list[0]!, next_id: 0 }, ...list.slice(1)];
}

/** 以某条为中心取了一页（跳转定位）：和窗口连得上就合并，否则换成这一页 */
export function applyAroundPage(list: readonly Msg[], page: readonly Msg[]): Msg[] {
  if (page.length === 0) return list as Msg[];
  const max = page[0]!.id;
  const min = page[page.length - 1]!.id;
  const ids = new Set(list.map((m) => m.id));
  const joined =
    list.some((m) => m.id >= min && m.id <= max) || ids.has(page[0]!.next_id ?? 0) || ids.has(page[page.length - 1]!.prev_id ?? 0);
  return joined ? upsertMsgs(list, page) : upsertMsgs([], page);
}
