import { DomUtils, parseDocument } from 'htmlparser2';

import type { Block, BodyContext, ImageBlock, ListItem, Run } from './types';

/**
 * HTML → 块结构，对照旧前端 utils/sharedWebViewMsgBody.js 的 parseRich（那边用 DOMParser，这里用 htmlparser2，三端一致）。
 *
 * 网页编辑器每行一个 `<p>`，相邻段落之间没有间距，所以非 Markdown 时相邻段落合并成一段、以换行分隔；
 * Markdown 渲染出的 HTML 按 HTML 规则排版（空白折叠，换行只来自 `<br>`）
 */

type Doc = ReturnType<typeof parseDocument>;
type Node = Doc['children'][number];
type El = Extract<Node, { type: 'tag' | 'script' | 'style' }> & { name: string; attribs: Record<string, string> };

/** 行内解析的中间结果：图片以 `{image}` 带出，再由 runsToBlocks 拆成图片块 */
type Piece = Run | { image: ImageBlock };

interface Ctx extends BodyContext {
  markdown: boolean;
  /** 正文里 li 的序号（待办勾选定位用） */
  li: { n: number };
  app?: Record<string, string>;
}

const IMAGE_MAX_RATIO = 3;

const BLOCK_TAGS = new Set(['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'ul', 'ol', 'pre', 'table', 'hr', 'img', 'section', 'article', 'details']);

const URL_REG = /https?:\/\/[\w=?./&\-:+%;#@,!~]+/g;

const isImage = (p: Piece): p is { image: ImageBlock } => 'image' in p;
const isEl = (node: Node): node is El => DomUtils.isTag(node);
const classes = (el: El) => (el.attribs.class ?? '').split(/\s+/).filter(Boolean);
const hasClass = (el: El, name: string) => classes(el).includes(name);
const textOf = (node: Node | Node[]) => DomUtils.textContent(node);

export function absoluteUrl(url: string, origin: string): string {
  if (!url) return '';
  const full = url.replace(/\{\{RemoteURL\}\}/g, origin);
  return /^(https?:|data:|file:|dootask:|mailto:|tel:)/i.test(full) ? full : origin + full.replace(/^\/+/, '');
}

/** 去掉缩略图后缀，得到原图地址 */
export function thumbRestore(url: string): string {
  return url.replace(/_thumb\.(png|jpg|jpeg)$/, '').replace(/\/crop\/([^/]+)$/, '');
}

function sameHost(url: string, origin: string) {
  try {
    return new URL(url).host === new URL(origin).host;
  } catch {
    return false;
  }
}

/** 图片地址与显示比例：过长过宽的本站图取服务器裁剪的缩略图，比例同步收窄（与网页一致） */
export function imageSource(src: string, rawWidth: unknown, rawHeight: unknown, origin: string) {
  let width = Number.parseInt(String(rawWidth ?? ''), 10) || 0;
  let height = Number.parseInt(String(rawHeight ?? ''), 10) || 0;
  let url = absoluteUrl(src, origin);
  const exceed = width > 0 && height > 0 && (width / height > IMAGE_MAX_RATIO + 0.5 || height / width > IMAGE_MAX_RATIO + 0.5);
  if (exceed && /\.(png|jpg|jpeg)$/.test(url) && sameHost(url, origin)) {
    url = `${thumbRestore(url)}/crop/ratio:${IMAGE_MAX_RATIO},percentage:320x0`;
    if (width > height) width = height * IMAGE_MAX_RATIO;
    else height = width * IMAGE_MAX_RATIO;
  }
  return { src: url, width, height };
}

export function parseRich(html: string, ctx: BodyContext & { markdown: boolean }): Block[] {
  const source = html.trim().replace(/(\n\x20*){3,}/g, '\n\n');
  if (!source) return [];
  const doc = parseDocument(source);
  const blocks = parseBlocks(doc.children, { ...ctx, li: { n: 0 } });
  return ctx.markdown ? blocks : mergeParagraphs(blocks);
}

function mergeParagraphs(blocks: Block[]): Block[] {
  const out: Block[] = [];
  for (const block of blocks) {
    const last = out[out.length - 1];
    if (block.t === 'p' && last?.t === 'p') {
      // 空段落（<p><br></p>）就是一个空行
      last.runs = [...last.runs, { text: '\n' }, ...(isBlankRuns(block.runs) ? [] : block.runs)];
    } else if (block.t === 'quote' && last?.t === 'quote') {
      // 编辑器里引用是逐行一个 <blockquote>
      last.blocks = mergeParagraphs([...last.blocks, ...block.blocks]);
    } else {
      out.push(block.t === 'p' ? { t: 'p', runs: isBlankRuns(block.runs) ? [] : block.runs } : block);
    }
  }
  for (const block of out) {
    if (block.t === 'p') block.runs = cleanRuns(trimRuns(block.runs)) as Run[];
  }
  return out.filter((block) => block.t !== 'p' || block.runs.length > 0);
}

function isBlankRuns(runs: Piece[]) {
  return runs.every((run) => !isImage(run) && !run.mention && /^\s*$/.test(run.text));
}

/** 去掉段首段尾的空行 */
function trimRuns(runs: Run[]): Run[] {
  const list = runs.map((run) => ({ ...run }));
  while (list.length && !list[0]!.mention && /^\s*$/.test(list[0]!.text)) list.shift();
  while (list.length && !list[list.length - 1]!.mention && /^\s*$/.test(list[list.length - 1]!.text)) list.pop();
  if (list.length) {
    list[0]!.text = list[0]!.text.replace(/^\n+/, '');
    list[list.length - 1]!.text = list[list.length - 1]!.text.replace(/\n+$/, '');
  }
  return list.filter((run) => run.text !== '');
}

function isBlockNode(el: El) {
  return BLOCK_TAGS.has(el.name) || hasClass(el, 'katex-display');
}

/** 子节点 → 块；连续的行内节点收成一个段落 */
function parseBlocks(nodes: Node[], ctx: Ctx): Block[] {
  const blocks: Block[] = [];
  let inline: Piece[] = [];
  const flush = () => {
    const runs = cleanRuns(inline);
    inline = [];
    // 块之间的空白文字（排版用的换行）不成段；空段落由 parseBlock 的 p 分支处理
    if (isBlankRuns(runs)) return;
    blocks.push(...runsToBlocks(ctx.markdown ? collapseSpaces(runs) : runs));
  };
  for (const node of nodes) {
    if (isEl(node) && isBlockNode(node)) {
      flush();
      blocks.push(...parseBlock(node, ctx));
    } else {
      inline.push(...parseInline(node, ctx, baseMarks(ctx)));
    }
  }
  flush();
  return blocks;
}

/** 段落里的图片拆出来自成一块，前后文字各成一段 */
function runsToBlocks(runs: Piece[]): Block[] {
  const blocks: Block[] = [];
  let text: Run[] = [];
  const push = () => {
    if (text.length) blocks.push({ t: 'p', runs: text });
    text = [];
  };
  for (const run of runs) {
    if (isImage(run)) {
      push();
      blocks.push(run.image);
    } else {
      text.push(run);
    }
  }
  push();
  return blocks;
}

/** Markdown：去掉换行两侧与段落首尾的空格（代码片段除外） */
function collapseSpaces(runs: Piece[]): Piece[] {
  const list = runs.map((run) => (isImage(run) || run.code ? run : { ...run, text: run.text.replace(/ *\n */g, '\n') }));
  list.forEach((run, index) => {
    if (isImage(run) || run.code) return;
    const prev = list[index - 1];
    const next = list[index + 1];
    if (!prev || isImage(prev) || prev.text.endsWith('\n')) run.text = run.text.replace(/^ +/, '');
    if (!next || isImage(next) || next.text.startsWith('\n')) run.text = run.text.replace(/ +$/, '');
  });
  return list.filter((run) => isImage(run) || run.text !== '');
}

/** 标题、表格单元格只留文字 */
function textRuns(runs: Piece[]): Run[] {
  return cleanRuns(runs).filter((run): run is Run => !isImage(run));
}

function baseMarks(ctx: Ctx): Partial<Run> {
  return ctx.app ? { app: ctx.app } : {};
}

function microApp(el: El): Record<string, string> {
  return Object.fromEntries(Object.entries(el.attribs).flatMap(([k, v]) => (k.startsWith('data-') ? [[k.slice(5), v]] : [])));
}

function parseBlock(el: El, parentCtx: Ctx): Block[] {
  const ctx = hasClass(el, 'open-micro-app') ? { ...parentCtx, app: microApp(el) } : parentCtx;
  switch (el.name) {
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6': {
      const runs = textRuns(parseInlineChildren(el, ctx, baseMarks(ctx)));
      return runs.length ? [{ t: 'h', level: Number(el.name.slice(1)), runs }] : [];
    }
    case 'blockquote': {
      const blocks = ctx.markdown ? parseBlocks(el.children, ctx) : mergeParagraphs(parseBlocks(el.children, ctx));
      return blocks.length ? [{ t: 'quote', blocks }] : [];
    }
    case 'ul':
    case 'ol':
      return parseList(el, ctx);
    case 'pre': {
      const code = DomUtils.findOne((n) => n.name === 'code', el.children);
      // 旧版网页渲染的代码块带语言标题；Markdown 的 ```js 由 markdown-it 写在 code 的 language-js 类上
      const header = DomUtils.findOne((n) => hasClass(n as El, 'code-block-header__lang'), el.children);
      const lang = header ? textOf(header).trim() : (/(?:^|\s)language-(\S+)/.exec(code?.attribs.class ?? '')?.[1] ?? '');
      return [{ t: 'code', lang, text: textOf(code ?? el).replace(/\n$/, '') }];
    }
    case 'table':
      return parseTable(el, ctx);
    case 'hr':
      return [{ t: 'hr' }];
    case 'details': {
      const summary = el.children.find((n): n is El => isEl(n) && n.name === 'summary');
      return [
        {
          t: 'details',
          summary: summary ? trimRuns(textRuns(collapseSpaces(parseInlineChildren(summary, ctx, baseMarks(ctx))))) : [],
          blocks: parseBlocks(el.children.filter((n) => n !== summary), ctx),
        },
      ];
    }
    case 'p': {
      // 编辑器的空段落是空行，合并段落时要用到；Markdown 的空段落直接丢掉
      const blocks = parseBlocks(el.children, ctx);
      return blocks.length || ctx.markdown ? blocks : [{ t: 'p', runs: [] }];
    }
    case 'img': {
      const img = parseImage(el, ctx);
      return img ? [img] : [];
    }
  }
  if (hasClass(el, 'katex-display')) return [{ t: 'math', text: katexSource(el) }];
  if (hasClass(el, 'apply-reasoning')) {
    const content = DomUtils.findOne((n) => hasClass(n as El, 'reasoning-content'), el.children);
    const blocks = content ? parseBlocks(content.children, ctx) : [];
    return blocks.length ? [{ t: 'reasoning', blocks }] : [];
  }
  if (hasClass(el, 'input-blink')) return [];
  // 其余容器（div 等）展开为子块
  return parseBlocks(el.children, ctx);
}

const LIST_MARKS = ['ordered', 'bullet', 'checked', 'unchecked'] as const;

/**
 * 列表：网页编辑器（Quill）的列表都是 `<ol>`，类型在每个 `<li data-list>` 上，缩进用 ql-indent-N；
 * Markdown 的是常规嵌套列表；任务描述（TinyMCE）的待办是 `<ul class="tox-checklist">`
 */
function parseList(el: El, ctx: Ctx): Block[] {
  const checklist = hasClass(el, 'tox-checklist');
  const fallback = el.name === 'ol' ? 'ordered' : 'bullet';
  const start = Number.parseInt(el.attribs.start ?? '', 10) || 1;
  const counters: number[] = [];
  const items: ListItem[] = [];
  for (const li of el.children) {
    if (!isEl(li) || li.name !== 'li') continue;
    const data = li.attribs['data-list'] as ListItem['mark'] | undefined;
    const mark: ListItem['mark'] = checklist ? (hasClass(li, 'tox-checklist--checked') ? 'checked' : 'unchecked') : data && LIST_MARKS.includes(data) ? data : fallback;
    const indent = Number(/\bql-indent-(\d+)\b/.exec(li.attribs.class ?? '')?.[1] ?? 0);
    // 编号：同一缩进连续的有序项递增，遇到更浅的项时更深层重新计数
    counters.length = indent + 1;
    const index = ctx.li.n++;
    const item: ListItem = { mark, blocks: mergeParagraphs(parseBlocks(li.children, ctx)) };
    if (mark === 'checked' || mark === 'unchecked') item.index = index;
    if (mark === 'ordered') {
      counters[indent] = (counters[indent] || start - 1) + 1;
      item.num = counters[indent];
    } else {
      counters[indent] = 0;
    }
    if (indent > 0) item.indent = indent;
    items.push(item);
  }
  return items.length ? [{ t: 'list', items }] : [];
}

function parseTable(el: El, ctx: Ctx): Block[] {
  const rows: Run[][][] = [];
  let head = false;
  DomUtils.findAll((n) => n.name === 'tr', el.children).forEach((tr, index) => {
    const cells: Run[][] = [];
    for (const cell of tr.children) {
      if (!isEl(cell) || (cell.name !== 'td' && cell.name !== 'th')) continue;
      cells.push(textRuns(parseInlineChildren(cell, ctx, baseMarks(ctx))));
      if (index === 0 && cell.name === 'th') head = true;
    }
    if (cells.length) rows.push(cells);
  });
  return rows.length ? [{ t: 'table', head, rows }] : [];
}

function parseImage(el: El, ctx: Ctx): ImageBlock | null {
  const src = el.attribs.src;
  if (!src) return null;
  // 任务描述（TinyMCE）的图片可能没有 width / height，原图尺寸记在 original-width / original-height
  const a = el.attribs;
  const block: ImageBlock = { t: 'img', ...imageSource(src, a.width ?? a['original-width'], a.height ?? a['original-height'], ctx.origin) };
  if (hasClass(el, 'emoticon')) {
    block.emoticon = true;
    block.alt = a.alt ?? '';
  } else {
    block.url = absoluteUrl(thumbRestore(src), ctx.origin);
  }
  return block;
}

function katexSource(el: El) {
  const annotation = DomUtils.findOne((n) => n.name === 'annotation' && n.attribs.encoding === 'application/x-tex', el.children);
  return textOf(annotation ?? el).trim();
}

function parseInlineChildren(el: El, ctx: Ctx, marks: Partial<Run>): Piece[] {
  return el.children.flatMap((node) => parseInline(node, ctx, marks));
}

function parseInline(node: Node, ctx: Ctx, marks: Partial<Run>): Piece[] {
  if (node.type === 'text') {
    let text = node.data.replace(/﻿/g, '');
    text = ctx.markdown ? text.replace(/[ \t\r\n]+/g, ' ').replace(/ /g, ' ') : text.replace(/ /g, ' ').replace(/\{\{RemoteURL\}\}/g, ctx.origin);
    return text ? linkify(text, marks) : [];
  }
  if (!isEl(node)) return [];
  const el = node;
  switch (el.name) {
    case 'br':
      return [{ ...marks, text: '\n' }];
    case 'img': {
      const img = parseImage(el, ctx);
      return img ? [{ image: img }] : [];
    }
    case 'strong':
    case 'b':
      return parseInlineChildren(el, ctx, { ...marks, b: true });
    case 'em':
    case 'i':
      return parseInlineChildren(el, ctx, { ...marks, i: true });
    case 'u':
      return parseInlineChildren(el, ctx, { ...marks, u: true });
    case 's':
    case 'del':
    case 'strike':
      return parseInlineChildren(el, ctx, { ...marks, s: true });
    case 'code':
      return [{ ...marks, code: true, text: textOf(el) }];
    case 'a': {
      const href = absoluteUrl(el.attribs.href ?? '', ctx.origin);
      return parseInlineChildren(el, ctx, href ? { ...marks, href } : marks);
    }
    case 'span':
      if (hasClass(el, 'mention')) {
        const id = Number.parseInt(el.attribs['data-id'] ?? '', 10) || 0;
        if (hasClass(el, 'okr')) return [{ ...marks, text: textOf(el), app: { name: 'okr', id: String(id) } }];
        const kind = hasClass(el, 'task') ? 'task' : id === ctx.userId ? 'me' : 'user';
        return [{ ...marks, text: textOf(el), mention: kind, id }];
      }
      if (hasClass(el, 'mark-set') || hasClass(el, 'mark-insert')) return [{ ...marks, text: textOf(el), fill: hasClass(el, 'mark-set') ? 'set' : 'insert' }];
      if (hasClass(el, 'katex')) return [{ ...marks, code: true, text: katexSource(el) }];
      break;
    case 'script':
    case 'style':
      return [];
  }
  const inner = hasClass(el, 'open-micro-app') ? { ...marks, app: microApp(el) } : marks;
  // 行内上下文（标题、单元格、加粗等）里嵌了块，只取文字
  if (isBlockNode(el)) return [{ ...inner, text: textOf(el) }];
  return parseInlineChildren(el, ctx, inner);
}

/** 纯文本里的网址转为链接（已在链接内的不处理） */
function linkify(text: string, marks: Partial<Run>): Run[] {
  if (marks.href || marks.code || !/https?:\/\//.test(text)) return [{ ...marks, text }];
  const runs: Run[] = [];
  let last = 0;
  for (const match of text.matchAll(URL_REG)) {
    const index = match.index;
    if (index > last) runs.push({ ...marks, text: text.slice(last, index) });
    runs.push({ ...marks, text: match[0], href: match[0] });
    last = index + match[0].length;
  }
  if (last < text.length) runs.push({ ...marks, text: text.slice(last) });
  return runs;
}

const MARK_KEYS = ['b', 'i', 'u', 's', 'code', 'href', 'app'] as const;

/** 整理片段：丢掉空文字，合并标记相同的相邻文字；@成员、快捷命令各自独立 */
function cleanRuns(runs: Piece[]): Piece[] {
  const out: Piece[] = [];
  for (const run of runs) {
    if (isImage(run)) {
      out.push(run);
      continue;
    }
    if (!run.text) continue;
    const last = out[out.length - 1];
    if (last && !isImage(last) && !last.mention && !run.mention && !last.fill && !run.fill && MARK_KEYS.every((k) => (last[k] ?? false) === (run[k] ?? false))) {
      last.text += run.text;
    } else {
      out.push({ ...run });
    }
  }
  return out;
}
