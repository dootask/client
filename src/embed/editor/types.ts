import type { Ref, RefObject } from 'react';

import type { EditorApi, EditorEvent, EditorInit, EditorTheme } from './protocol';

/** 编辑区对外：调用编辑器（见 EditorApi），focus 同时让承载它的视图拿到焦点（App 上弹出键盘） */
export type EditorHandle = Omit<EditorApi, 'init' | 'theme'>;

/** Web 上的按键先交给宿主（候选列表的上下键、回车，Ctrl / ⌘ + 回车发送），处理了返回 true，编辑器不再处理 */
export type EditorKeys = RefObject<((key: string, mod: boolean) => boolean) | null>;

export interface EditorSurfaceProps {
  /** 只在创建时取一次 */
  init: EditorInit;
  theme: EditorTheme;
  onEvent: (event: EditorEvent) => void;
  keysRef?: EditorKeys;
  ref?: Ref<EditorHandle>;
}
