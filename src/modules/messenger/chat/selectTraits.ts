import type { ViewStyle } from 'react-native';

import type { AppTheme } from '../../../ui/theme/tokens';

/** 多选时左侧勾选圈所在格：Web 保持原样（左内边距 16、圈 22） */
export function selectCell(theme: AppTheme): ViewStyle {
  return { width: theme.size.checkMark + theme.spacing.page, paddingLeft: theme.spacing.page };
}

/** 选中的行是否铺底色（旧版 App 铺 rowHighlight，Web 保持原样不铺） */
export const selectRowHighlight = false;
