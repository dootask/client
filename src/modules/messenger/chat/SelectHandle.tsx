import { View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

import type { SelectHandleProps } from './selectHandleTypes';

/** 上下移动超过这么多才算拖动（之前仍是点按切换这一行） */
const DRAG_ACTIVE = 8;

/** 从勾选圈上下拖动：手指经过的行连续勾选，拖动期间列表不滚 */
export function SelectHandle({ msgId, drag, style, children }: SelectHandleProps) {
  const { begin, move, end } = drag;
  const pan = usePanGesture({
    activeOffsetY: [-DRAG_ACTIVE, DRAG_ACTIVE],
    onActivate: () => {
      'worklet';
      runOnJS(begin)(msgId);
    },
    onUpdate: (event) => {
      'worklet';
      runOnJS(move)(event.absoluteY);
    },
    onFinalize: () => {
      'worklet';
      runOnJS(end)();
    },
  });
  return (
    <GestureDetector gesture={pan}>
      <View style={style} collapsable={false}>{children}</View>
    </GestureDetector>
  );
}
