import type { ViewStyle } from 'react-native';

import type { AppTheme } from '../../../ui/theme/tokens';

/** 多选时左侧勾选圈所在格（同旧版 App SelectFrame）：44 宽，圈居中 */
export function selectCell(theme: AppTheme): ViewStyle {
  return { width: theme.size.checkMarkCell, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' };
}

/** 选中的行铺 rowHighlight（同旧版 App） */
export const selectRowHighlight = true;
