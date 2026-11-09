/**
 * 输入栏内容：纯文本 + mentions（@成员、#任务、~文件、%报告 的 id），与消息 HTML 互转。
 * mention 在文本里是「符号 + 名称」，mentions 按出现顺序排列，转 HTML 时依次在文本里认领。
 * 发送、草稿都存 HTML（与旧前端的编辑器格式一致，草稿两端通用）：一行一个段落
 */

export type MentionChar = '@' | '#' | '~' | '%';
/** 输入后弹出候选的符号：mention 的符号，加上 / 快捷菜单 */
export type PickerChar = MentionChar | '/';

export interface Mention {
  char: MentionChar;
  /** @ 的 0 为所有人 */
  id: number;
  name: string;
}

export interface ComposeValue {
  text: string;
  mentions: Mention[];
}

export const EMPTY_COMPOSE: ComposeValue = { text: '', mentions: [] };

const MENTION_CHARS: readonly string[] = ['@', '#', '~', '%'];

interface Claimed {
  start: number;
  end: number;
  mention: Mention;
}

/** 按顺序在文本里认领每个 mention 的位置，认领不到的丢弃 */
function claim(text: string, mentions: readonly Mention[]): Claimed[] {
  const claimed: Claimed[] = [];
  let cursor = 0;
  for (const mention of mentions) {
    const token = mention.char + mention.name;
    const start = text.indexOf(token, cursor);
    if (start < 0) continue;
    claimed.push({ start, end: start + token.length, mention });
    cursor = start + token.length;
  }
  return claimed;
}

/**
 * 输入框文字变化后的内容与光标位置
 * 删除碰到 mention 时整个删掉；在 mention 中间插入文字时它变回普通文字
 */
export function applyTextChange(prev: ComposeValue, text: string): { value: ComposeValue; cursor: number } {
  const old = prev.text;
  let head = 0;
  const maxHead = Math.min(old.length, text.length);
  while (head < maxHead && old[head] === text[head]) head++;
  let tail = 0;
  const maxTail = Math.min(old.length, text.length) - head;
  while (tail < maxTail && old[old.length - 1 - tail] === text[text.length - 1 - tail]) tail++;
  const removedEnd = old.length - tail;
  const inserted = text.length - tail > head;

  const claimed = claim(old, prev.mentions);
  const hit = claimed.filter((c) => (removedEnd > head ? c.start < removedEnd && c.end > head : c.start < head && c.end > head));
  const kept = claimed.filter((c) => !hit.includes(c)).map((c) => c.mention);

  if (hit.length > 0 && !inserted) {
    const start = Math.min(head, ...hit.map((c) => c.start));
    const end = Math.max(removedEnd, ...hit.map((c) => c.end));
    const next = old.slice(0, start) + old.slice(end);
    return { value: { text: next, mentions: claim(next, kept).map((c) => c.mention) }, cursor: start };
  }
  return { value: { text, mentions: claim(text, kept).map((c) => c.mention) }, cursor: text.length - tail };
}

/** 光标前正在输入的候选查询：符号在开头或空白之后、不属于已有的 mention，到光标之间没有空白 */
export function mentionQuery(value: ComposeValue, cursor: number, chars: readonly PickerChar[]): { start: number; char: PickerChar; query: string } | null {
  const before = value.text.slice(0, cursor);
  const start = Math.max(...chars.map((char) => before.lastIndexOf(char)));
  if (start < 0 || (start > 0 && !/\s/.test(before[start - 1]!))) return null;
  const query = before.slice(start + 1);
  if (/\s/.test(query) || query.length > 20) return null;
  if (claim(value.text, value.mentions).some((c) => c.start === start)) return null;
  return { start, char: before[start] as PickerChar, query };
}

/** 内容只有这一个 @ 时（回复自动加的）去掉它，否则原样返回 */
export function dropLoneMention(value: ComposeValue, userid: number): ComposeValue {
  const [only] = value.mentions;
  const lone = value.mentions.length === 1 && only!.char === '@' && only!.id === userid && value.text.trim() === only!.char + only!.name;
  return lone ? EMPTY_COMPOSE : value;
}

/** 用选中的 mention 替换 [start, end) 的查询文字，后面补一个空格 */
export function insertMention(value: ComposeValue, start: number, end: number, mention: Mention): { value: ComposeValue; cursor: number } {
  const token = `${mention.char}${mention.name} `;
  const text = value.text.slice(0, start) + token + value.text.slice(end);
  const shift = token.length - (end - start);
  const ordered = claim(value.text, value.mentions)
    .map((c) => ({ at: c.start < start ? c.start : c.start + shift, mention: c.mention }))
    .concat({ at: start, mention })
    .sort((a, b) => a.at - b.at)
    .map((c) => c.mention);
  return { value: { text, mentions: claim(text, ordered).map((c) => c.mention) }, cursor: start + token.length };
}

/** 按 mention 切分文字，供输入框高亮 */
export function composeSegments(value: ComposeValue): { text: string; mention: boolean }[] {
  const segments: { text: string; mention: boolean }[] = [];
  let pos = 0;
  for (const c of claim(value.text, value.mentions)) {
    if (c.start > pos) segments.push({ text: value.text.slice(pos, c.start), mention: false });
    segments.push({ text: value.text.slice(c.start, c.end), mention: true });
    pos = c.end;
  }
  if (pos < value.text.length) segments.push({ text: value.text.slice(pos), mention: false });
  return segments;
}

export function sameCompose(a: ComposeValue, b: ComposeValue): boolean {
  return a.text === b.text && JSON.stringify(a.mentions) === JSON.stringify(b.mentions);
}

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const ENTITIES: Record<string, string> = { '&nbsp;': ' ', '&quot;': '"', '&#39;': "'", '&lt;': '<', '&gt;': '>', '&amp;': '&' };
const escapeHtml = (text: string) => text.replace(/[&<>"]/g, (c) => ESCAPES[c]!);
const unescapeHtml = (text: string) => text.replace(/&(nbsp|quot|#39|lt|gt|amp);/g, (m) => ENTITIES[m]!);

/** 与旧前端编辑器（quill-mention）输出一致的 mention 标签，服务端按这个结构解析 */
function mentionHtml({ char, id, name }: Mention) {
  const value = escapeHtml(name);
  return `<span class="mention" data-denotation-char="${char}" data-id="${id}" data-value="${value}">﻿<span contenteditable="false"><span class="ql-mention-denotation-char">${char}</span>${value}</span>﻿</span>`;
}

/** 输入栏内容 → HTML：每行一个 `<p>`，空行写 `<br>`；首尾空行去掉 */
export function composeToHtml({ text, mentions }: ComposeValue): string {
  const trimmed = text.replace(/\r\n?/g, '\n').replace(/^\n+|\s+$/g, '');
  let html = '';
  let pos = 0;
  for (const c of claim(trimmed, mentions)) {
    html += escapeHtml(trimmed.slice(pos, c.start)) + mentionHtml(c.mention);
    pos = c.end;
  }
  html += escapeHtml(trimmed.slice(pos));
  // mention 标签里没有换行，按换行切段落不会切到标签内部
  return html
    .split('\n')
    .map((line) => `<p>${line || '<br>'}</p>`)
    .join('');
}

/** 编辑器里的 mention（草稿）：三层 span，属性顺序不定 */
const EDITOR_MENTION = /<span class="mention"([^>]*)>(?:[\s\S]*?<\/span>){3}/g;
/** 服务端存的 mention（已发出的消息）：@ 成员、# 任务；~ 文件和 % 报告存的是链接，没有 id，当普通文字 */
const STORED_MENTION = /<span class="mention (user|task)" data-id="(\d+)">([^<]*)<\/span>/g;
const attr = (attrs: string, name: string) => attrs.match(new RegExp(`${name}="([^"]*)"`))?.[1];
/** 占位符：私用区字符包住 mention 的序号，转纯文本时原样保留 */
const SLOT = /(\d+)/g;

/** HTML → 输入栏内容：段落、换行变成换行，表情图换成 [名字]，mention 记进 mentions，其余标签去掉 */
export function htmlToCompose(html: string): ComposeValue {
  const found: Mention[] = [];
  const slot = (mention: Mention | null, raw: string) => {
    if (!mention || !MENTION_CHARS.includes(mention.char) || !mention.name || Number.isNaN(mention.id)) return raw;
    found.push(mention);
    return `${found.length - 1}`;
  };
  const marked = html
    .replace(EDITOR_MENTION, (raw, attrs: string) =>
      slot({ char: attr(attrs, 'data-denotation-char') as MentionChar, id: Number(attr(attrs, 'data-id')), name: unescapeHtml(attr(attrs, 'data-value') ?? '') }, raw),
    )
    .replace(STORED_MENTION, (raw, kind: string, id: string, content: string) => {
      const char = kind === 'user' ? '@' : '#';
      const name = unescapeHtml(content).replace(/﻿/g, '');
      return slot(name.startsWith(char) ? { char, id: Number(id), name: name.slice(1) } : null, raw);
    });
  const text = unescapeHtml(
    marked
      .replace(/<img\s+class="emoticon"[^>]*?alt="([^"]+)"[^>]*?>/g, '[$1]')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|h[1-6]|blockquote|pre)>/gi, '\n')
      .replace(/<[^>]*>/g, ''),
  )
    .replace(/﻿/g, '')
    .replace(/\n\n/g, '\n')
    .replace(/^\n+|\s+$/g, '');
  const mentions: Mention[] = [];
  const restored = text.replace(SLOT, (_, index: string) => {
    const mention = found[Number(index)]!;
    mentions.push(mention);
    return mention.char + mention.name;
  });
  return { text: restored, mentions };
}

/** Markdown 语法的特征和分量：标题、代码块、链接最像，列表、引用这类普通文字里也常见的只占一点（与旧前端 detectMarkdownSyntaxWeight 一致） */
const MARKDOWN_SIGNS: readonly [RegExp, number][] = [
  [/^#{1,6}\s+.+$/m, 0.4],
  [/```[\s\S]*?```/, 0.4],
  [/\[[^\]]+\]\([^)]+\)/, 0.3],
  [/!\[[^\]]*\]\([^)]+\)/, 0.3],
  [/\*\*[^*\s][^*]*[^*\s]\*\*/, 0.2],
  [/__[^_\s][^_]*[^_\s]__/, 0.2],
  [/~~[^~\s][^~]*[^~\s]~~/, 0.2],
  [/`[^`\s][^`]*[^`\s]`/, 0.15],
  [/^[-*+]\s+.+$/m, 0.1],
  [/^\d+\.\s+.+$/m, 0.1],
  [/^>\s+.+$/m, 0.1],
];

/** 默认发送时是否按 Markdown 发：带 mention 的不算（Markdown 发的是纯文字，mention 会丢），其余按语法特征累计分量 */
export function looksLikeMarkdown({ text, mentions }: ComposeValue): boolean {
  if (mentions.length > 0) return false;
  const weight = MARKDOWN_SIGNS.reduce((sum, [regex, w]) => (regex.test(text) ? sum + w : sum), 0);
  return weight >= 0.3;
}
