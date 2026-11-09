import type { Insets, StyleProp, ViewStyle } from 'react-native';

import type { TouchState } from '../../../ui/Touchable';
import type { Attach } from './attach';
import type { Extra } from './extras';

export interface AttachButtonProps {
  attach: Attach;
  /** 投票、接龙等入口：App 在加号面板里，Web 在下拉菜单里 */
  extras: Extra[];
  hitSlop: Insets;
  style: (state: TouchState) => StyleProp<ViewStyle>;
}
