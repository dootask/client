import type { Preview } from '../preview';

/**
 * 消息正文的块结构：HTML、Markdown 正文解析成块和行内片段，界面直接按块画原生组件，
 * 不在气泡里套网页。图片带尺寸，先占好位，图片晚到不会撑动列表
 */

/** 行内片段；没有的标记不出现 */
export interface Run {
  text: string;
  b?: boolean;
  i?: boolean;
  u?: boolean;
  s?: boolean;
  code?: boolean;
  href?: string;
  /** @成员（me 是 @ 自己，高亮更醒目）、# 任务 */
  mention?: 'user' | 'me' | 'task';
  id?: number;
  /** 点了打开的微应用（`.open-micro-app` 的 data 属性原样带出，打开微应用 M4 再做） */
  app?: Record<string, string>;
  /** 点了填进输入栏的命令：替换或插入 */
  fill?: 'set' | 'insert';
}

export interface ImageBlock {
  t: 'img';
  src: string;
  width: number;
  height: number;
  /** 原图；表情没有 */
  url?: string;
  emoticon?: boolean;
  alt?: string;
}

export interface ListItem {
  mark: 'ordered' | 'bullet' | 'checked' | 'unchecked';
  num?: number;
  /** 待办项在正文里的序号（勾选时交给后端定位） */
  index?: number;
  indent?: number;
  blocks: Block[];
}

export type Block =
  | { t: 'p'; runs: Run[] }
  | { t: 'h'; level: number; runs: Run[] }
  | { t: 'quote'; blocks: Block[] }
  | { t: 'reasoning'; blocks: Block[] }
  | { t: 'list'; items: ListItem[] }
  | { t: 'code'; lang: string; text: string }
  | { t: 'table'; head: boolean; rows: Run[][][] }
  | ImageBlock
  | { t: 'hr' };

/** 系统消息里的文字：界面翻译后显示 */
export type SystemLabel = 'tagAdd' | 'tagRemove' | 'topAdd' | 'topRemove' | 'todoAdd' | 'todoRemove' | 'todoDone' | 'todoTarget' | 'withdrawSelf';

/** 系统消息拆成片段：用户（名字由界面按用户资料填）、要翻译的文字、被操作消息的摘要、原样文字 */
export type SystemPart = { userid: number } | { label: SystemLabel } | { preview: Preview } | { text: string };

export type MsgBody =
  | { kind: 'rich'; blocks: Block[]; long?: boolean; sticker?: boolean }
  /** AI 回复生成中的占位（正文是 `...`） */
  | { kind: 'typing' }
  | { kind: 'image' | 'video'; src: string; width: number; height: number; url: string }
  | { kind: 'file'; name: string; ext: string; size: number; url: string }
  | { kind: 'record'; url: string; duration: number; text: string }
  | { kind: 'system'; parts: SystemPart[] }
  /** 卡片类消息（投票、接龙、位置、会议、合并转发、模板），N5 做完整显示前只显示摘要 */
  | { kind: 'card'; preview: Preview }
  | { kind: 'unknown' };

/** 引用的原消息 */
export interface ReplyInfo {
  id: number;
  userid: number;
  /** 原消息是 AI 助手（userid 为 -1）时的名字 */
  name: string;
  preview: Preview;
  thumb?: string;
}

export interface Reaction {
  symbol: string;
  /** 回应的人，按回应先后 */
  userids: number[];
  mine: boolean;
}

/** 解析时用到的环境 */
export interface BodyContext {
  /** 当前用户（@我 的高亮、回应里有没有自己） */
  userId: number;
  /** 服务器根地址，带结尾的 `/`（替换 `{{RemoteURL}}`、补全相对地址） */
  origin: string;
}
