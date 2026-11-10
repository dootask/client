import type Quill from 'quill-hi';

import type { EditorApi, EditorChar, EditorEvent, EditorMention, EditorTheme } from './protocol';

/**
 * 全屏编辑器的 Quill 逻辑：与旧前端输入框同一个 Quill、同样的格式，发出的 HTML 一致。
 * App 的编辑页（scripts/editor-page.mjs 把它转成脚本拼进页面）和 Web 共用；这里只能用 DOM，运行时不引用任何模块，
 * Quill 由调用方传入（页面里是全局的 Quill，Web 上是动态加载的模块）
 */

const FORMATS = ['bold', 'strike', 'italic', 'underline', 'blockquote', 'list', 'link', 'image', 'mention'];
const CHECK = ['checked', 'unchecked'];
const MENTION_CHARS = ['@', '#', '~', '%'];

/** 编辑器样式：颜色、字号、间距经 CSS 变量传入（见 themeVars），作用于 .dt-editor 之内 */
export const EDITOR_STYLE = `
.dt-editor { height: 100%; background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", Roboto, Helvetica, Arial, sans-serif; font-size: var(--font-size); line-height: var(--line-height); }
.dt-editor .ql-container { font-size: inherit; font-family: inherit; }
.dt-editor .ql-editor { padding: var(--padding); line-height: var(--line-height); -webkit-user-select: text; user-select: text; }
.dt-editor .ql-editor.ql-blank::before { color: var(--placeholder); font-style: normal; left: var(--padding); right: var(--padding); }
.dt-editor .ql-editor a { color: var(--link); text-decoration: none; }
.dt-editor .ql-editor blockquote { margin: 4px 0; padding-left: 12px; border-left: 3px solid var(--quote); color: var(--secondary); }
.dt-editor .ql-editor ol { padding-left: 0; }
.dt-editor .ql-editor li { padding-left: 24px; }
.dt-editor .ql-editor li > .ql-ui:before { margin-left: -24px; margin-right: 4px; width: 20px; text-align: left; }
.dt-editor .ql-editor li > .ql-ui, .dt-editor .ql-editor li[data-list=checked] > .ql-ui, .dt-editor .ql-editor li[data-list=unchecked] > .ql-ui { color: var(--secondary); }
.dt-editor .ql-editor li[data-list=checked] { color: var(--secondary); text-decoration: line-through; }
.dt-editor .ql-editor .mention { color: var(--link); }
`;

/** 主题 → CSS 变量 */
export function themeVars(theme: EditorTheme): Record<string, string> {
  return {
    '--bg': theme.bg,
    '--text': theme.text,
    '--secondary': theme.secondary,
    '--placeholder': theme.placeholder,
    '--link': theme.link,
    '--quote': theme.quote,
    '--font-size': `${theme.fontSize}px`,
    '--line-height': `${theme.lineHeight}px`,
    '--padding': `${theme.padding}px`,
  };
}

interface MentionValue {
  denotationChar: string;
  id: string;
  value: string;
}

/**
 * host 是编辑器的容器（带 dt-editor 类）；post 把事件交给宿主
 */
export function createEditor(QuillClass: typeof Quill, host: HTMLElement, post: (event: EditorEvent) => void): EditorApi & { destroy: () => void } {
  let quill: Quill | null = null;
  let chars: readonly EditorChar[] = [];
  let lastQuery = '';
  let lastState = '';

  const editor = () => quill!;
  // 键盘弹出、工具栏收起时高度变化，光标保持可见
  const onResize = () => quill?.scrollSelectionIntoView();

  /** 内容的纯文本（mention 为「符号 + 名称」）、mention 列表，以及是否只有文字、换行与 mention */
  function snapshot() {
    let text = '';
    let plain = true;
    const mentions: EditorMention[] = [];
    for (const op of editor().getContents().ops) {
      if (op.attributes && Object.keys(op.attributes).length > 0) plain = false;
      if (typeof op.insert === 'string') {
        text += op.insert;
      } else if (op.insert && typeof op.insert === 'object' && 'mention' in op.insert) {
        const { denotationChar, id, value } = op.insert.mention as MentionValue;
        text += denotationChar + value;
        if (MENTION_CHARS.includes(denotationChar)) mentions.push({ char: denotationChar as EditorMention['char'], id: Number.parseInt(id, 10) || 0, name: value });
      } else {
        plain = false;
      }
    }
    return { text: text.replace(/\s+$/, ''), mentions, plain };
  }

  function reportChange() {
    post({ type: 'change', html: editor().root.innerHTML, ...snapshot() });
  }

  function reportState() {
    const range = editor().getSelection();
    if (!range) return;
    const formats = editor().getFormat(range);
    const state = JSON.stringify(formats);
    if (state === lastState) return;
    lastState = state;
    post({ type: 'state', formats });
  }

  /** 光标前、同一行里的「符号 + 关键词」：符号在行首或空白之后，关键词没有空白 */
  function currentQuery() {
    const range = editor().getSelection();
    if (!range || range.length > 0 || chars.length === 0) return null;
    const [line, offset] = editor().getLine(range.index);
    if (!line) return null;
    const before = editor().getText(range.index - offset, offset);
    const match = /(?:^|\s)(\S)(\S{0,20})$/.exec(before);
    if (!match) return null;
    const char = match[1] as EditorChar;
    const text = match[2]!;
    if (!chars.includes(char) || chars.some((c) => text.includes(c))) return null;
    return { char, text, index: range.index - text.length - 1 };
  }

  function reportQuery() {
    const query = currentQuery();
    const key = query ? `${query.char}${query.text}` : '';
    if (key === lastQuery) return;
    lastQuery = key;
    post({ type: 'query', query: query && { char: query.char, text: query.text, atStart: !editor().getText(0, query.index).trim() } });
  }

  function applyTheme(theme: EditorTheme) {
    for (const [name, value] of Object.entries(themeVars(theme))) host.style.setProperty(name, value);
  }

  /** 光标所在的链接：起点与长度 */
  function linkAt(index: number) {
    const [leaf] = editor().getLeaf(index);
    let blot = leaf as { statics: { blotName: string }; parent: unknown; length: () => number } | null;
    while (blot && blot.statics.blotName !== 'link') {
      blot = blot.parent as typeof blot;
      if ((blot as unknown) === editor().scroll) return null;
    }
    return blot ? { index: editor().getIndex(blot as never), length: blot.length() } : null;
  }

  return {
    init({ html, append, placeholder, chars: list }) {
      chars = list;
      const mount = document.createElement('div');
      host.appendChild(mount);
      quill = new QuillClass(mount, { formats: FORMATS, placeholder, modules: { toolbar: false } });
      if (html) quill.clipboard.dangerouslyPasteHTML(html, 'silent');
      if (append) quill.insertText(quill.getLength() - 1, append, 'silent');
      quill.on('text-change', () => {
        reportChange();
        reportQuery();
      });
      quill.on('editor-change', () => {
        reportState();
        reportQuery();
      });
      window.addEventListener('resize', onResize);
      reportChange();
      quill.setSelection(quill.getLength(), 0, 'silent');
      quill.focus();
      post({ type: 'ready' });
    },

    theme: applyTheme,

    toggle(name, value) {
      const range = editor().getSelection(true);
      const current = editor().getFormat(range)[name];
      const active = value === 'unchecked' ? CHECK.includes(current as string) : current === value;
      editor().format(name, active ? false : value, 'user');
      reportState();
    },

    link(url) {
      const range = editor().getSelection(true);
      if (range.length > 0) {
        editor().formatText(range.index, range.length, 'link', url, 'user');
      } else {
        editor().insertText(range.index, url, { link: url }, 'user');
        editor().setSelection(range.index + url.length, 0, 'silent');
      }
      reportState();
    },

    unlink() {
      const range = editor().getSelection(true);
      const target = range.length > 0 ? range : linkAt(range.index);
      if (target) editor().formatText(target.index, target.length, 'link', false, 'user');
      reportState();
    },

    mention({ char, id, name }) {
      const query = currentQuery();
      if (!query || query.char !== char) return;
      const range = editor().getSelection(true);
      editor().deleteText(query.index, range.index - query.index, 'user');
      editor().insertEmbed(query.index, 'mention', { denotationChar: char, id: String(id), value: name }, 'user');
      editor().insertText(query.index + 1, ' ', 'user');
      editor().setSelection(query.index + 2, 0, 'user');
    },

    replaceQuery(text) {
      const query = currentQuery();
      if (!query) return;
      const range = editor().getSelection(true);
      editor().deleteText(query.index, range.index - query.index, 'user');
      editor().insertText(query.index, text, 'user');
      editor().setSelection(query.index + text.length, 0, 'user');
    },

    focus() {
      editor().focus();
    },

    destroy() {
      window.removeEventListener('resize', onResize);
    },
  };
}
