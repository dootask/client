/**
 * 全屏编辑器（Quill）与宿主之间的消息。App 上编辑器跑在 WebView 里，这些消息走 postMessage / injectJavaScript；
 * Web 上直接在页面里创建编辑器，同样的消息改成函数调用
 */

/** 编辑器里 mention 的符号；/ 只用来弹快捷菜单 */
export type EditorChar = '@' | '#' | '~' | '%' | '/';

export interface EditorMention {
  char: '@' | '#' | '~' | '%';
  id: number;
  name: string;
}

/** 配色、字号、间距，由宿主按主题经 CSS 变量传入 */
export interface EditorTheme {
  bg: string;
  text: string;
  secondary: string;
  placeholder: string;
  link: string;
  quote: string;
  fontSize: number;
  lineHeight: number;
  padding: number;
}

export interface EditorInit {
  /** 初始内容（编辑器 HTML） */
  html: string;
  /** 放在末尾的文字（富文本草稿时插入的表情、语音转的文字） */
  append?: string;
  placeholder: string;
  /** 可用的候选符号 */
  chars: readonly EditorChar[];
}

/** 光标处的格式：Quill 的 getFormat 结果 */
export type EditorFormats = Record<string, unknown>;

/** 光标前正在输入的候选查询；atStart 为符号前面没有内容（机器人命令只在开头出） */
export interface EditorQuery {
  char: EditorChar;
  text: string;
  atStart: boolean;
}

/** 编辑器 → 宿主 */
export type EditorEvent =
  /** 脚本就绪，等宿主 init（只有 App 的页面会发） */
  | { type: 'boot' }
  /** init 完成并已聚焦 */
  | { type: 'ready' }
  /** 内容变化；plain 为没有格式（可以放回普通输入框） */
  | { type: 'change'; html: string; text: string; mentions: EditorMention[]; plain: boolean }
  | { type: 'state'; formats: EditorFormats }
  | { type: 'query'; query: EditorQuery | null };

/** 宿主 → 编辑器 */
export interface EditorApi {
  init: (init: EditorInit) => void;
  theme: (theme: EditorTheme) => void;
  /** 有选中文字时作用于选中部分，没有时作用于接着输入的文字（引用、列表作用于所在行） */
  toggle: (name: string, value: string | boolean) => void;
  /** 选中文字时加上链接，否则在光标处插入地址作为链接文字 */
  link: (url: string) => void;
  /** 去掉选中文字或光标所在链接的链接 */
  unlink: () => void;
  /** 用选中的候选替换光标前的查询文字 */
  mention: (mention: EditorMention) => void;
  /** / 菜单选中项：把「/关键词」换成给定文字 */
  replaceQuery: (text: string) => void;
  focus: () => void;
}
