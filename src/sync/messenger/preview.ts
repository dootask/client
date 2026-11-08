import type { LastMsg } from '../api/dialog';

/**
 * 消息的一行摘要（会话列表的最后一条、回复引用等），对照主仓库 WebSocketDialogMsg::previewMsg 和旧前端 getMsgSimpleDesc。
 * 列表接口给的已经是服务端按用户语言生成的 type=preview；推送来的完整消息在这里生成。
 * 结果拆成「标签 + 正文」，标签由界面翻译后套上方括号，这一层不碰语言
 */

/** 摘要前面方括号里的标签 */
export type PreviewLabel =
  | 'longtext'
  | 'vote'
  | 'wordChain'
  | 'voice'
  | 'location'
  | 'meeting'
  | 'image'
  | 'video'
  | 'file'
  | 'tag'
  | 'untag'
  | 'top'
  | 'untop'
  | 'todo'
  | 'untodo'
  | 'todoDone'
  | 'forward'
  | 'sticker'
  | 'unknown';

/** 文字里的状态提示（AI 回复生成中等），整段替换正文 */
export type PreviewStatus = 'aiWaiting' | 'aiRunning' | 'aiStopped' | 'aiThinking';

export interface Preview {
  /** 依次显示的标签，嵌套消息（标注、置顶、待办）会有两个 */
  labels: PreviewLabel[];
  status?: PreviewStatus;
  text: string;
}

const MAX = 50;

const cut = (text: unknown, max = MAX) => {
  const s = typeof text === 'string' ? text : '';
  return s.length > max ? `${s.slice(0, max)}...` : s;
};

type Data = Record<string, unknown>;
const obj = (v: unknown): Data => (v && typeof v === 'object' ? (v as Data) : {});

const ENTITIES: Record<string, string> = { '&nbsp;': ' ', '&quot;': '"', '&amp;': '&', '&lt;': '<', '&gt;': '>' };

/** HTML 正文转一行纯文字；表情图换成 [名字]，图片换成 [图片] 标记由调用方处理 */
export function htmlToLine(html: string): string {
  return html
    .replace(/<img\s+class="emoticon"[^>]*?alt="(\S+)"[^>]*?>/g, '[$1]')
    .replace(/<\/p><p>/g, '</p> <p>')
    .replace(/<[^>]*>/g, '')
    .replace(/&(nbsp|quot|amp|lt|gt);/g, (m) => ENTITIES[m]!)
    .replace(/\s+/g, ' ')
    .trim();
}

/** Markdown 正文：去掉过程标记，取一二级标题，没有就去掉常见标记符号 */
function markdownLine(md: string): string | PreviewStatus {
  let text = md
    .replace(/^>\s*<tool-use>[^<]*<\/tool-use>\s*$/gm, '')
    .replace(/<\/?tool-use[^>]*>/g, '')
    .replace(/:::\s*reasoning[\s\S]*?:::/g, '');
  if (/:::\s*reasoning\s+/.test(text)) return 'aiThinking';
  const title = text.match(/^#{1,2}\s+(.+)/m)?.[1]?.trim();
  if (title) return title;
  text = text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)]\([^)]*\)/g, '$1')
    .replace(/^[\s>#*+-]+|[*_`~]/gm, '');
  return htmlToLine(text);
}

function textPreview(msg: Data, labels: PreviewLabel[]): Preview {
  const ai = obj(msg.ai);
  const status = typeof ai.status === 'string' ? ai.status : '';
  if (status === 'queued' || status === 'running') return { labels, status: 'aiRunning', text: '' };
  if (status === 'waiting_confirm') return { labels, status: 'aiWaiting', text: '' };
  const raw = typeof msg.text === 'string' ? msg.text : '';
  if (status && raw === '...') return status === 'cancelled' ? { labels, status: 'aiStopped', text: '' } : { labels, text: '' };
  if (!raw) return { labels, text: '' };
  let html = raw;
  if (msg.type === 'md') {
    const line = markdownLine(raw);
    if (line === 'aiThinking') return { labels, status: line, text: '' };
    html = line;
  }
  // 正文里的表情动图、图片只剩标签
  if (/<img\s+class="emoticon"(?![^>]*?alt="\S+")[^>]*?>/.test(html)) labels = [...labels, 'sticker'];
  else if (/<img\s+class="browse"[^>]*?>/.test(html)) labels = [...labels, 'image'];
  html = html.replace(/<img\s+class="emoticon"(?![^>]*?alt="\S+")[^>]*?>/g, '').replace(/<img\s+class="browse"[^>]*?>/g, '');
  return { labels, text: cut(htmlToLine(html)) };
}

function templatePreview(msg: Data): Preview {
  if (typeof msg.title_raw === 'string' && msg.title_raw) return { labels: [], text: msg.title_raw };
  const list = Array.isArray(msg.list) ? msg.list : [];
  const title = typeof msg.title === 'string' ? msg.title : '';
  if (msg.type === 'task_list' && list.length === 1) return { labels: [], text: `${title}: ${cut(obj(list[0]).name)}` };
  if (title) return { labels: [], text: title };
  if (msg.type === 'content' && typeof msg.content === 'string' && msg.content) return { labels: [], text: cut(msg.content) };
  return { labels: ['unknown'], text: '' };
}

/** 一条消息（或会话的 last_msg）的摘要；空消息返回 null */
export function msgPreview(data: Pick<LastMsg, 'type' | 'msg'> | null | undefined, depth = 0): Preview | null {
  if (!data) return null;
  const msg = obj(data.msg);
  const tagged = (label: PreviewLabel, inner: unknown): Preview => {
    const sub = depth < 2 ? msgPreview(obj(inner) as Pick<LastMsg, 'type' | 'msg'>, depth + 1) : null;
    return { labels: [label, ...(sub?.labels ?? [])], status: sub?.status, text: sub?.text ?? '' };
  };
  switch (data.type) {
    case 'preview':
      return { labels: [], text: typeof msg.preview === 'string' ? msg.preview : '' };
    case 'text':
      return textPreview(msg, []);
    case 'longtext':
      return msg.desc ? { labels: [], text: cut(msg.desc) } : { labels: ['longtext'], text: '' };
    case 'vote':
      return textPreview(msg, ['vote']);
    case 'word-chain':
      return textPreview(msg, ['wordChain']);
    case 'record':
      return { labels: ['voice'], text: '' };
    case 'location':
      return { labels: ['location'], text: cut(msg.title) };
    case 'meeting':
      return { labels: ['meeting'], text: cut(msg.name) };
    case 'file':
      if (msg.type === 'img') return { labels: ['image'], text: '' };
      if (msg.ext === 'mp4') return { labels: ['video'], text: '' };
      return { labels: ['file'], text: cut(msg.name) };
    case 'tag':
      return tagged(msg.action === 'remove' ? 'untag' : 'tag', msg.data);
    case 'top':
      return tagged(msg.action === 'remove' ? 'untop' : 'top', msg.data);
    case 'todo':
      return tagged(msg.action === 'remove' ? 'untodo' : msg.action === 'done' ? 'todoDone' : 'todo', msg.data);
    case 'notice':
      return { labels: [], text: cut(msg.notice) };
    case 'merge-forward':
      return { labels: ['forward'], text: '' };
    case 'template':
      return templatePreview(msg);
    default:
      return { labels: ['unknown'], text: '' };
  }
}

/** 会话最后一条的发送者：待办完成消息显示最后完成的人 */
export function lastSenderId(last: LastMsg | null | undefined): number {
  if (!last) return 0;
  const msg = obj(last.msg);
  if (last.type === 'todo' && msg.action === 'done') {
    const done = obj(msg.data).done_userids;
    if (Array.isArray(done) && typeof done[0] === 'number') return done[0];
  }
  return last.userid ?? 0;
}

/** 草稿（HTML）转一行；图片只剩标签 */
export function draftPreview(html: string): Preview {
  const labels: PreviewLabel[] = /<img[^>]*>/i.test(html) ? ['image'] : [];
  return { labels, text: htmlToLine(html.replace(/<img[^>]*>/gi, '')) };
}
