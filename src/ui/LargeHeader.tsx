import { createContext, type ReactNode, type Ref, useContext, useState } from 'react';
import { type ScrollViewInstance, type ScrollViewProps, Text, View } from 'react-native';
import Animated, {
  type SharedValue,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedStyle,
  useScrollOffset,
} from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { scheduleOnRN } from 'react-native-worklets';

import { Touchable } from './Touchable';

/**
 * 窄屏 Tab 根页的大标题（同旧版 MobileLargeHeader + MobileCompactBar）：
 * 大标题随列表一起滚走，滚过分界线后顶部出现小标题条。
 * 列表的滚动位置用 ScrollOffsetProvider 给出的 shared value 跟踪，列表把 TrackedScrollView 交给 renderScrollComponent
 */

const OffsetContext = createContext<SharedValue<number> | undefined>(undefined);

export const ScrollOffsetProvider = OffsetContext.Provider;

/** 滚动位置写进 ScrollOffsetProvider 给的 shared value（UI 线程上同步，吸顶、渐显不掉帧） */
export function TrackedScrollView({ ref, ...props }: ScrollViewProps & { ref?: Ref<ScrollViewInstance> }) {
  const offset = useContext(OffsetContext);
  const animatedRef = useAnimatedRef<ScrollViewInstance>();
  useScrollOffset(animatedRef, offset);
  return (
    <Animated.ScrollView
      {...props}
      ref={(node: ScrollViewInstance | null) => {
        animatedRef(node);
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
    />
  );
}

/** 大标题行：左边标题，右边可放按钮 */
export function LargeTitle({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
        {title}
      </Text>
      {right}
    </View>
  );
}

/**
 * 小标题条：盖在列表顶部。滚动位置到 line 之前 compactBarFade 像素底色开始渐显，到 line 时不透明并可点；
 * 之后标题再滚 compactTitleFade 像素完全显示。点击回到顶部。
 * line：滚动多少时分界（被观察的元素刚好被小标题条盖住）；showLine：显示底部分隔线（下面紧接吸顶的分类条时不显示）
 */
export function CompactBar({
  title,
  offset,
  line,
  showLine,
  onPress,
}: {
  title: string;
  offset: SharedValue<number>;
  line: number;
  showLine: boolean;
  onPress: () => void;
}) {
  const { theme } = useUnistyles();
  const { compactBarFade, compactTitleFade } = theme.size;
  const [visible, setVisible] = useState(false);
  useAnimatedReaction(
    () => offset.get() >= line,
    (now, before) => {
      if (now !== before) scheduleOnRN(setVisible, now);
    },
  );
  const barStyle = useAnimatedStyle(() => ({ opacity: clamp01((offset.get() - line + compactBarFade) / compactBarFade) }));
  const titleStyle = useAnimatedStyle(() => ({ opacity: clamp01((offset.get() - line) / compactTitleFade) }));
  return (
    <Animated.View style={[styles.bar(showLine), barStyle]} pointerEvents={visible ? 'auto' : 'none'}>
      <Touchable accessibilityRole="button" onPress={onPress} style={styles.barPress}>
        <Animated.Text style={[styles.barTitle, titleStyle]} numberOfLines={1}>
          {title}
        </Animated.Text>
      </Touchable>
    </Animated.View>
  );
}

function clamp01(value: number) {
  'worklet';
  return Math.min(Math.max(value, 0), 1);
}

const styles = StyleSheet.create((theme) => ({
  row: {
    minHeight: theme.size.largeTitleRow,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  title: {
    ...theme.typography.largeTitle,
    flex: 1,
    minWidth: 0,
    color: theme.colors.titleText,
  },
  bar: (showLine: boolean) => ({
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    height: theme.size.compactBar,
    backgroundColor: theme.colors.headerBg,
    borderBottomWidth: showLine ? StyleSheet.hairlineWidth : 0,
    borderBottomColor: theme.colors.headerLine,
  }),
  barPress: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.size.compactBarInset,
  },
  barTitle: {
    ...theme.typography.barTitle,
    color: theme.colors.titleText,
    textAlign: 'center',
  },
}));
