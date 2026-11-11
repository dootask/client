import type { Msg } from '../../api/dialog';
import { msgPreview } from '../preview';
import { absoluteUrl, imageSource, parseRich } from './html';
import { markdownToHtml } from './markdown';
import type { Block, BodyContext, MsgBody, Reaction, ReplyInfo, SystemPart } from './types';

/**
 * 消息 → 界面要画的内容，对照旧前端 utils/sharedWebViewMsgBody.js 的 msgContent。
 * 只取决于消息正文和当前用户；正文对象不变时沿用上次的结果
 */

export interface MsgContent {
  body: MsgBody;
  reply: ReplyInfo | null;
  /** 转发来源（显示「转发自」） */
  forward: { userid: number } | null;
}

type Data = Record<string, unknown>;
const obj = (v: unknown): Data => (v && typeof v === 'object' ? (v as Data) : {});
const str = (v: unknown) => (typeof v === 'string' ? v : '');
const int = (v: unknown) => Number.parseInt(String(v ?? ''), 10) || 0;

const cache = new WeakMap<object, { key: string; content: MsgContent }>();

export function msgContent(m: Msg, ctx: BodyContext): MsgContent {
  const msg = obj(m.msg);
  const key = `${m.type}:${m.reply_id ?? 0}:${ctx.userId}:${ctx.origin}`;
  const hit = cache.get(msg);
  if (hit && hit.key === key) return hit.content;
  const content: MsgContent = {
    body: ['text', 'longtext'].includes(m.type) ? richBody(m.type, msg, ctx) : plainBody(m, msg, ctx),
    reply: replyInfo(m, msg, ctx),
    forward: forwardInfo(m, msg),
  };
  if (m.msg && typeof m.msg === 'object') cache.set(msg, { key, content });
  return content;
}

/** 正文的块结构（Markdown 或编辑器 HTML） */
export function textBlocks(text: string, md: boolean, ctx: BodyContext): Block[] {
  return md ? parseRich(markdownToHtml(text), { ...ctx, markdown: true }) : parseRich(text, { ...ctx, markdown: false });
}

export function reactions(m: Msg, userId: number): Reaction[] {
  const list = (m as { emoji?: unknown }).emoji;
  if (!Array.isArray(list)) return [];
  return list.flatMap((item) => {
    const { symbol, userids } = obj(item);
    if (typeof symbol !== 'string' || !symbol || !Array.isArray(userids) || userids.length === 0) return [];
    const ids = userids.map(Number).filter((id) => id > 0);
    return ids.length ? [{ symbol, userids: ids, mine: ids.includes(userId) }] : [];
  });
}

function replyInfo(m: Msg, msg: Data, ctx: BodyContext): ReplyInfo | null {
  const data = obj(msg.reply_data);
  const userid = int(data.userid);
  if (!m.reply_id || !userid) return null;
  const inner = obj(data.msg);
  const info: ReplyInfo = {
    id: m.reply_id,
    userid,
    name: userid === -1 ? str(inner.nickname) : '',
    preview: msgPreview({ type: str(data.type), msg: data.msg }) ?? { labels: [], text: '' },
  };
  if (data.type === 'file' && inner.type === 'img') info.thumb = absoluteUrl(str(inner.thumb), ctx.origin);
  return info;
}

function forwardInfo(m: Msg, msg: Data) {
  const data = obj(msg.forward_data);
  const forwardId = int((m as { forward_id?: unknown }).forward_id);
  if (!forwardId || !data.show || !int(data.userid)) return null;
  return { userid: int(data.userid) };
}

function richBody(type: string, msg: Data, ctx: BodyContext): MsgBody {
  const text = str(msg.text);
  const md = msg.type === 'md';
  if (type === 'text' && md && text.trim() === '...') return { kind: 'typing' };
  const blocks = textBlocks(text, md, ctx);
  if (type === 'longtext') return { kind: 'rich', blocks, long: true };
  // 只有一张表情图的消息按贴纸显示（不套气泡）
  const only = blocks.length === 1 ? blocks[0] : undefined;
  return only?.t === 'img' && only.emoticon ? { kind: 'rich', blocks, sticker: true } : { kind: 'rich', blocks };
}

function plainBody(m: Msg, msg: Data, ctx: BodyContext): MsgBody {
  switch (m.type) {
    case 'file':
      return fileBody(msg, ctx);
    case 'record':
      return { kind: 'record', url: absoluteUrl(str(msg.path), ctx.origin), duration: int(msg.duration), text: str(msg.text) };
    case 'tag':
    case 'top': {
      const remove = msg.action === 'remove';
      const label = m.type === 'tag' ? (remove ? 'tagRemove' : 'tagAdd') : remove ? 'topRemove' : 'topAdd';
      return system([{ userid: m.userid }, { label }, quoted(msg.data)]);
    }
    case 'todo':
      return todoBody(msg, m.userid);
    case 'notice':
      return system([{ text: str(msg.notice) }]);
    case 'withdraw':
      return system([{ label: 'withdrawSelf' }]);
    case 'vote':
    case 'word-chain':
    case 'location':
    case 'meeting':
    case 'merge-forward':
    case 'template': {
      const preview = msgPreview({ type: m.type, msg: m.msg });
      return preview ? { kind: 'card', preview } : { kind: 'unknown' };
    }
    default:
      return { kind: 'unknown' };
  }
}

function fileBody(msg: Data, ctx: BodyContext): MsgBody {
  const url = absoluteUrl(str(msg.path), ctx.origin);
  if (msg.type === 'img') return { kind: 'image', ...imageSource(str(msg.thumb), msg.width, msg.height, ctx.origin), url };
  if (msg.ext === 'mp4' && int(msg.width) > 0 && int(msg.height) > 0) return { kind: 'video', ...imageSource(str(msg.thumb), msg.width, msg.height, ctx.origin), url };
  return { kind: 'file', name: str(msg.name), ext: str(msg.ext).toLowerCase(), size: Number(msg.size) || 0, url };
}

function quoted(data: unknown): SystemPart {
  const d = obj(data);
  return { preview: msgPreview({ type: str(d.type), msg: d.msg }) ?? { labels: [], text: '' } };
}

function todoBody(msg: Data, senderId: number): MsgBody {
  const data = obj(msg.data);
  if (msg.action === 'done') {
    const done = Array.isArray(data.done_userids) ? data.done_userids.map(int).filter(Boolean) : [];
    return system([...userParts(done.length ? done : [senderId]), { label: 'todoDone' }, quoted(msg.data)]);
  }
  if (msg.action === 'remove') return system([{ userid: senderId }, { label: 'todoRemove' }, quoted(msg.data)]);
  const targets = String(data.userids ?? '')
    .split(',')
    .map(int)
    .filter((id) => id > 0);
  const parts: SystemPart[] = [{ userid: senderId }, { label: 'todoAdd' }, quoted(msg.data)];
  if (targets.length) parts.push({ label: 'todoTarget' }, ...userParts(targets));
  return system(parts);
}

/** 用户列表最多列 3 个，其余显示 +N */
function userParts(userids: number[]): SystemPart[] {
  const parts: SystemPart[] = userids.slice(0, 3).map((userid) => ({ userid }));
  if (userids.length > 3) parts.push({ text: `+${userids.length - 3}` });
  return parts;
}

function system(parts: SystemPart[]): MsgBody {
  return { kind: 'system', parts };
}
