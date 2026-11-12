import type { ViewStyle } from 'react-native';

import type { AppTheme } from '../../../ui/theme/tokens';

/** App 多选（同旧版 App SelectFrame）：左侧单独一列勾选格，选中的行铺 rowHighlight */
export const selectTraits = { inRow: false, highlight: true };

/** 左侧勾选格：44 宽，圈居中 */
export function selectCell(theme: AppTheme): ViewStyle {
  return { width: theme.size.checkMarkCell, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' };
}
