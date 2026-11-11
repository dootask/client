import type { Selection } from './selection';

/** 多选时顶替输入区的一栏（App 是带图标的按钮，Web 保持原样） */
export interface SelectionBarProps {
  selection: Selection;
  /** 打开转发弹层；merge 决定「合并转发」是否默认勾上（Web 保持现有默认） */
  onForward: (msgIds: number[], merge: boolean) => void;
  onMerge: (msgIds: number[]) => void;
  onFavorite: (msgIds: number[]) => void;
}
