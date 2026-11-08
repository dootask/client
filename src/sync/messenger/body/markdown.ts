import MarkdownIt from 'markdown-it';

/**
 * Markdown → HTML，对照旧前端 utils/markdown.js 的 MarkdownConver：配置相同（允许 HTML、换行即 `<br>`），
 * 加上 `:::reasoning` 思考过程块。代码高亮、公式（N5）、AI 操作按钮和深链（N7）在这层还没做
 */

let md: MarkdownIt | null = null;

const cache = new Map<string, string>();
const CACHE_MAX = 200;

function create() {
  const it = new MarkdownIt({ html: true, breaks: true, linkify: false, typographer: true });
  it.block.ruler.before('fence', 'reasoning', (state, startLine, endLine, silent) => {
    const start = state.bMarks[startLine]! + state.tShift[startLine]!;
    const firstLine = state.src.slice(start, state.eMarks[startLine]).trim();
    if (!/^:::\s*reasoning(?:\s+\S+)?$/.test(firstLine)) return false;
    if (silent) return true;
    let next = startLine + 1;
    const content: string[] = [];
    while (next < endLine) {
      const line = state.src.slice(state.bMarks[next]! + state.tShift[next]!, state.eMarks[next]);
      if (line.trim() === ':::') break;
      content.push(state.getLines(next, next + 1, state.tShift[next]!, true));
      next++;
    }
    state.push('reasoning_open', 'div', 1).attrs = [['class', 'apply-reasoning']];
    state.push('reasoning_content_open', 'div', 1).attrs = [['class', 'reasoning-content']];
    if (content.length) state.md.block.parse(content.join('\n'), state.md, state.env, state.tokens);
    state.push('reasoning_content_close', 'div', -1);
    state.push('reasoning_close', 'div', -1);
    state.line = next + 1;
    return true;
  });
  return it;
}

export function markdownToHtml(text: string): string {
  const hit = cache.get(text);
  if (hit !== undefined) {
    cache.delete(text);
    cache.set(text, hit);
    return hit;
  }
  md ??= create();
  const source = text
    .replace(/:::\s*reasoning\s*[\r\n]*\s*:::/g, '')
    .replace(/:::ai-action\{[^}]*\}:::/g, '');
  const html = md.render(source).replace(/<(link|script|style)[^>]*>[\s\S]*?<\/\1>|<(link|script|style)[^>]*\/?>/gi, '');
  cache.set(text, html);
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value!);
  return html;
}
