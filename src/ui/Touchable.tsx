import { type ReactNode, type Ref, useState } from 'react';
import { type HostInstance, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

export interface TouchState {
  pressed: boolean;
  /** 鼠标悬停（只有 Web / 桌面和接了鼠标的平板会有） */
  hovered: boolean;
}

export type TouchableProps = Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle> | ((state: TouchState) => StyleProp<ViewStyle>);
  children?: ReactNode | ((state: TouchState) => ReactNode);
  ref?: Ref<HostInstance>;
};

/** 可点的区域：按下态和悬停态都交给调用方按令牌画 */
export function Touchable({ style, children, onHoverIn, onHoverOut, ref, ...rest }: TouchableProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      {...rest}
      ref={ref}
      onHoverIn={(event) => {
        setHovered(true);
        onHoverIn?.(event);
      }}
      onHoverOut={(event) => {
        setHovered(false);
        onHoverOut?.(event);
      }}
      style={({ pressed }) => (typeof style === 'function' ? style({ pressed, hovered }) : style)}
    >
      {({ pressed }) => (typeof children === 'function' ? children({ pressed, hovered }) : children)}
    </Pressable>
  );
}
