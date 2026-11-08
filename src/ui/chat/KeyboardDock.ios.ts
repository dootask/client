import type { ComponentRef, ComponentType } from 'react';
import { findNodeHandle, type View } from 'react-native';
import { requireNativeModule, requireNativeViewManager } from 'expo-modules-core';

import type { KeyboardDockProps, Rect } from './keyboardDockTypes';

/**
 * iOS 底部坞：消息区与输入栏由 UIKit 按 keyboardLayoutGuide 托着跟随键盘（与键盘同一个动画），
 * 面板的托起也在原生做。原生实现在 modules/keyboard-dock
 */
export const KeyboardDock: ComponentType<KeyboardDockProps> | null = requireNativeViewManager('DooTaskKeyboardDock');

const dockModule = requireNativeModule<{ measureInWindow: (tag: number) => Promise<Rect | null> }>('DooTaskKeyboardDock');

/**
 * 视图的窗口位置。ChatView 里（消息行、输入栏及其上方的浮层）的视图要用它：
 * 坞的位移只在原生层，React Native 的 measureInWindow 按布局树算，键盘或面板弹着时差出它们的高度
 */
export function measureInWindow(view: ComponentRef<typeof View>): Promise<Rect> {
  const viaLayout = () => new Promise<Rect>((resolve) => {
    view.measureInWindow((x, y, width, height) => resolve({ x, y, width, height }));
  });
  const tag = findNodeHandle(view);
  if (!tag) return viaLayout();
  return dockModule.measureInWindow(tag).then((rect) => rect ?? viaLayout());
}
