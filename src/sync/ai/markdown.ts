/**
 * AI 回复正文的流式处理，对照主仓库 utils/ai-agent/markdown.js：
 * - repairMarkdownTail：生成中修补正文末尾没写完的 Markdown，不让半截语法露出来
 * - splitTaskLists：把正文切成普通 Markdown 段和任务列表段（任务链接列表就地变成任务卡片）
 */

// - [名称](dootask://task/{id}/{parent_id}) — 说明
const TASK_ITEM = /^\s*[-*+]\s+\[([^\]\n]+)\]\(dootask:\/\/task\/(\d+)(?:\/\d+)?\)\s*(?:(?:—|–|--|-|:|：)\s*(.*))?$/;
// 还没写完的列表项：- [名称…  或  - [名称](dootask://ta…
const PENDING_ITEM = /^\s*[-*+]\s+\[([^\]\n]*)(?:\](?:\([^)\n]*)?)?$/;
// 单独一行的加粗文字作为列表标题
const TITLE_LINE = /^\s*\*\*([^*\n]+?)\*\*\s*[:：]?\s*$/;
const FENCE = /^\s*(```|~~~)/;
const TABLE_ROW = /^\s*\|/;
const TABLE_DIVIDER = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;
const LONE_MARKER = /^\s*([-*+>#]+|\d+[.)])\s*$/;

/** 修补正文末尾没闭合的 Markdown（只在生成中用，结束后按原文显示） */
export function repairMarkdownTail(text: string): string {
  if (!text) return '';
  const lines = text.split('\n');

  // 没闭合的代码块：补上结尾，块内不做其他处理
  let fenced = false;
  for (const line of lines) if (FENCE.test(line)) fenced = !fenced;
  if (fenced) return `${text}${text.endsWith('\n') ? '' : '\n'}\`\`\``;

  // 表格：最后一行没写完先不显示；表头后还没有分隔行时整张表先不显示
  if (lines.length && TABLE_ROW.test(lines[lines.length - 1]!) && !text.endsWith('\n')) lines.pop();
  let end = lines.length;
  while (end > 0 && !lines[end - 1]!.trim()) end--;
  let start = end;
  while (start > 0 && TABLE_ROW.test(lines[start - 1]!)) start--;
  if (start < end && (end - start < 2 || !TABLE_DIVIDER.test(lines[start + 1]!))) lines.splice(start);

  // 结尾单独的 -、#、> 等符号先不显示
  while (lines.length && LONE_MARKER.test(lines[lines.length - 1]!)) lines.pop();

  let result = lines.join('\n');
  if (text.endsWith('\n') && result && !result.endsWith('\n')) result += '\n';
  return closeInline(stripPartialLink(result));
}

/** 末尾写了一半的链接、图片只留文字 */
function stripPartialLink(text: string) {
  return text
    .replace(/!\[[^\]\n]*(?:\](?:\([^)\n]*)?)?$/, '')
    .replace(/\[([^\]\n]*)\]\([^)\n]*$/, '$1')
    .replace(/\[([^\]\n]*)\]?$/, '$1');
}

/** 补上末段没闭合的 `、**、*、~~（紧贴结尾、后面还没内容的开头符号直接去掉） */
function closeInline(text: string) {
  const paragraphStart = text.lastIndexOf('\n\n') + 1;
  const stack: { token: string; at: number }[] = [];
  let code: number | null = null;
  for (let i = paragraphStart; i < text.length; i++) {
    const char = text[i];
    if (char === '\\') {
      i++;
      continue;
    }
    if (char === '`') {
      code = code === null ? i : null;
      continue;
    }
    if (code !== null) continue;
    let token: string | null = null;
    if (text.startsWith('**', i)) token = '**';
    else if (text.startsWith('~~', i)) token = '~~';
    else if (char === '*') {
      const prev = text[i - 1];
      const next = text[i + 1];
      const lineStart = i === 0 || prev === '\n';
      // 行首的列表符号、两边都是空白的星号不算强调
      if (!(lineStart && next === ' ') && ((next && !/\s/.test(next)) || (prev && !/\s/.test(prev)))) token = '*';
    }
    if (!token) continue;
    const index = stack.findIndex((item) => item.token === token);
    if (index >= 0) stack.splice(index);
    else stack.push({ token, at: i });
    i += token.length - 1;
  }
  if (code !== null) {
    stack.push({ token: '`', at: code });
    stack.sort((a, b) => a.at - b.at);
  }
  let result = text;
  let suffix = '';
  for (let i = stack.length - 1; i >= 0; i--) {
    const { token, at } = stack[i]!;
    if (!result.slice(at + token.length).trim()) result = result.slice(0, at) + result.slice(at + token.length);
    else suffix += token;
  }
  return suffix ? result.replace(/\s+$/, '') + suffix : result;
}

export interface TaskItem {
  /** 0 是还没写完的待定行（只有名称） */
  id: number;
  name: string;
  note: string;
}

export type TextSegment = { type: 'markdown'; text: string } | { type: 'tasks'; title: string; tasks: TaskItem[] };

/**
 * 正文切段：连续 2 条及以上、都以任务链接开头的列表项为任务列表段，其余为普通 Markdown 段。
 * 生成中末尾只有 1 条的任务列表也先按列表显示；紧跟在后面、还没写完的列表项作为待定行，写完整后并入列表
 */
export function splitTaskLists(text: string, live: boolean): TextSegment[] {
  const lines = text.split('\n');
  const segments: TextSegment[] = [];
  let buffer: string[] = [];
  let fenced = false;

  const flush = () => {
    const value = buffer.join('\n');
    if (value.trim()) segments.push({ type: 'markdown', text: value });
    buffer = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (FENCE.test(line)) fenced = !fenced;
    const first = !fenced && TASK_ITEM.exec(line);
    if (!first) {
      buffer.push(line);
      continue;
    }
    const tasks: TaskItem[] = [];
    let j = i;
    let match: RegExpExecArray | null = first;
    while (match) {
      tasks.push({ id: Number(match[2]), name: match[1]!.trim(), note: (match[3] ?? '').trim() });
      j++;
      match = j < lines.length ? TASK_ITEM.exec(lines[j]!) : null;
    }
    const atEnd = lines.slice(j).every((rest) => !rest.trim());
    let pending: string | null = null;
    if (live && j === lines.length - 1) {
      const partial = PENDING_ITEM.exec(lines[j]!);
      if (partial) pending = partial[1]!.trim();
    }
    if (tasks.length < 2 && !(live && (atEnd || pending !== null))) {
      buffer.push(...lines.slice(i, j));
      i = j - 1;
      continue;
    }
    // 前一行（可隔一个空行）是单独的加粗文字时作为标题
    let title = '';
    let back = buffer.length - 1;
    if (back >= 0 && !buffer[back]!.trim()) back--;
    const titleMatch = back >= 0 ? TITLE_LINE.exec(buffer[back]!) : null;
    if (titleMatch) {
      title = titleMatch[1]!.trim();
      buffer.splice(back);
    }
    flush();
    if (pending !== null) {
      tasks.push({ id: 0, name: pending, note: '' });
      j++;
    }
    segments.push({ type: 'tasks', title, tasks });
    i = j - 1;
  }
  flush();
  return segments;
}
