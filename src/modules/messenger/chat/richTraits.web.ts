import type { RichTraits } from './richTraits';

/** 旧版网页 markdown-body：块下距 16、标题上距 24，表格 1px 边框、白底隔行浅灰，分割线 0.25em 灰条 */
export const richTraits: RichTraits = {
  checkable: false,
  gap: (theme) => theme.size.markdown.gap,
  headTop: (theme) => theme.size.markdown.headTop,
  heading: ({ typography }, level) => (level <= 1 ? typography.mdH1 : level === 2 ? typography.mdH2 : level === 3 ? typography.mdH3 : typography.mdH4),
  summary: ({ typography }) => typography.mdSummary,
  hr: ({ size, colors }) => ({ height: size.markdown.hr, marginVertical: size.markdown.hrPad, backgroundColor: colors.mdBorder }),
  table: ({ size, colors, typography }) => ({
    line: colors.mdBorder,
    radius: 0,
    // 单元格按内容宽（旧版 table 为 max-content），超出气泡时表格横向滚动
    cell: { paddingHorizontal: size.markdown.cellPadX, paddingVertical: size.markdown.cellPadY },
    text: typography.mdCell,
  }),
  rowFill: ({ colors }, _tone, rowIndex, head) => {
    const bodyIndex = head ? rowIndex - 1 : rowIndex;
    return bodyIndex >= 0 && bodyIndex % 2 === 1 ? colors.mdStripe : colors.surface;
  },
};
