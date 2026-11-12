import { StyleSheet } from 'react-native-unistyles';
import type { TextStyle, ViewStyle } from 'react-native';

import type { AppTheme } from '../../../ui/theme';
import type { BubbleTone } from './RichText';

/** 正文块结构各端的排版差异（App 照旧版 App，网页照旧版网页的 markdown-body） */
export interface RichTraits {
  /** 块间距 */
  gap: (theme: AppTheme) => number;
  /** 标题、分割线比块间距多空的距离 */
  headTop: (theme: AppTheme) => number;
  heading: (theme: AppTheme, level: number, body: TextStyle) => TextStyle;
  /** 可折叠段落的标题 */
  summary: (theme: AppTheme, body: TextStyle) => TextStyle;
  hr: (theme: AppTheme, tone: BubbleTone) => ViewStyle;
  /** 表格边框色、圆角、单元格（内边距、最宽）和字 */
  table: (theme: AppTheme, tone: BubbleTone) => { line: string; radius: number; cell: ViewStyle; text: TextStyle };
  /** 表格行底色（rowIndex 含表头） */
  rowFill: (theme: AppTheme, tone: BubbleTone, rowIndex: number, head: boolean) => string | undefined;
  /** 自己消息里的待办项能不能点了勾选（旧版 App 能，旧版网页不能） */
  checkable: boolean;
}

export const richTraits: RichTraits = {
  checkable: true,
  gap: (theme) => theme.spacing.sm,
  headTop: () => 0,
  heading: (theme, level, body) => (level <= 2 ? theme.typography.title2 : { ...body, fontWeight: '600' }),
  summary: (_theme, body) => ({ ...body, fontWeight: '600' }),
  hr: (theme, tone) => ({ height: StyleSheet.hairlineWidth, marginVertical: theme.spacing.xs, backgroundColor: tone.separator }),
  table: (theme, tone) => ({
    line: tone.separator,
    radius: theme.radius.bubbleTight,
    // 单元格不换行，最宽不超过气泡，超出省略（同旧版 App）
    cell: { maxWidth: theme.size.bubbleMaxWidth - theme.spacing.xl * 2, paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs },
    text: theme.typography.subhead,
  }),
  rowFill: (_theme, tone, rowIndex, head) => (head && rowIndex === 0 ? tone.overlay : undefined),
};
