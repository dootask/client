import type { Insets, StyleProp, ViewStyle } from 'react-native';

import type { TouchState } from '../../../ui/Touchable';
import type { Attach } from './attach';

export interface AttachButtonProps {
  attach: Attach;
  hitSlop: Insets;
  style: (state: TouchState) => StyleProp<ViewStyle>;
}
