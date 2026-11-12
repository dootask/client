import type { Selection } from './selection';

/** 多选时顶替输入区的一栏（App 是带图标的按钮，Web 是旧版网页的操作条） */
export interface SelectionBarProps {
  selection: Selection;
  /** 打开转发弹层；merge 决定默认是否合并转发 */
  onForward: (msgIds: number[], merge: boolean) => void;
  onMerge: (msgIds: number[]) => void;
  onFavorite: (msgIds: number[]) => void;
}
