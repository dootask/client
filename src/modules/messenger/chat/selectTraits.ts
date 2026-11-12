import type { ViewStyle } from 'react-native';

import type { AppTheme } from '../../../ui/theme/tokens';

/**
 * Web 多选（旧版网页）：勾选格在消息行里、头像前面（自己的消息在右侧），28 格 22 圈，选中的行不铺底色。
 * inRow 时勾选格经 SelectCheckContext 交给 MsgFrame 放进行里
 */
export const selectTraits = { inRow: true, highlight: false };

export function selectCell(theme: AppTheme): ViewStyle {
  const { webSelect } = theme.size;
  return {
    width: webSelect.cell,
    height: webSelect.cell,
    marginTop: webSelect.cellTop,
    marginRight: webSelect.cellGap,
    alignItems: 'center',
    justifyContent: 'center',
  };
}
