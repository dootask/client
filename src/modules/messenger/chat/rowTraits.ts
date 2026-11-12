
import type { AppTheme } from '../../../ui/theme';

/**
 * App 消息列表：连续消息间距收紧、按天插日期、底色同页面；正文用 App 字号
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
  tightChain: true,
  dayLabels: true,
  listBg: 'bg',
  body: (theme) => theme.typography.body,
  systemChip: false,
  selectableText: false,
};
