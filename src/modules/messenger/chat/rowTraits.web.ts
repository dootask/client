
import type { AppTheme } from '../../../ui/theme';

/**
 * 旧版网页消息列表：每条消息一样的间距、不插日期（时间写在消息下方）、白底；正文 14，窄屏 15
 */
export const rowTraits: {
  tightChain: boolean;
  dayLabels: boolean;
  listBg: 'bg' | 'surface';
  /** narrow：窄屏（断点 xs） */
  body: (theme: AppTheme, narrow: boolean) => AppTheme['typography']['body'];
  /** 系统提示套灰底圆角条（旧版网页 .dialog-notice） */
  systemChip: boolean;
  /** 正文文字能用鼠标选中（旧版网页可以；App 长按出菜单，选字走「选择文本」页） */
  selectableText: boolean;
} = {
  tightChain: false,
  dayLabels: false,
  listBg: 'surface',
  body: ({ typography }, narrow) => (narrow ? typography.msgTextNarrow : typography.msgText),
  systemChip: true,
  selectableText: true,
};
