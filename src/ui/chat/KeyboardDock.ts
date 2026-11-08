import type { ComponentRef, ComponentType } from 'react';
import type { View } from 'react-native';

import type { KeyboardDockProps, Rect } from './keyboardDockTypes';

/** 只有 iOS 有底部坞（见 KeyboardDock.ios.ts）；Android 由 ChatView 逐帧平移 */
export const KeyboardDock: ComponentType<KeyboardDockProps> | null = null;

export function measureInWindow(view: ComponentRef<typeof View>): Promise<Rect> {
  return new Promise<Rect>((resolve) => {
    view.measureInWindow((x, y, width, height) => resolve({ x, y, width, height }));
  });
}
