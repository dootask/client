import { useEffect } from 'react';
import { View, type StyleProp, type TextStyle } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming, type SharedValue } from 'react-native-reanimated';
import { StyleSheet } from 'react-native-unistyles';

// 同旧版网页（.content-ai-run-shimmer）：文字压暗到 0.4，一道亮光 2 秒从左扫到右
const DURATION = 2000;
const DIM = 0.4;
/** 亮光半宽（占文字宽度的比例） */
const BAND = 0.2;

/**
 * 流光文字：表示仍在进行，替代转圈。逐字调透明度（不引入遮罩视图），只适合单行短句
 */
export function ShimmerText({ text, style }: { text: string; style: StyleProp<TextStyle> }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(withRepeat(withTiming(1, { duration: DURATION, easing: Easing.linear }), -1));
    return () => cancelAnimation(progress);
  }, [progress]);
  const chars = Array.from(text);
  return (
    <View style={styles.row} accessible accessibilityLabel={text}>
      {chars.map((char, index) => (
        <ShimmerChar key={index} char={char} position={(index + 0.5) / chars.length} progress={progress} style={style} />
      ))}
    </View>
  );
}

function ShimmerChar({ char, position, progress, style }: { char: string; position: number; progress: SharedValue<number>; style: StyleProp<TextStyle> }) {
  const animated = useAnimatedStyle(() => {
    // 亮光中心从文字左外侧走到右外侧
    const center = -BAND + progress.get() * (1 + BAND * 2);
    const light = Math.max(0, 1 - Math.abs(position - center) / BAND);
    return { opacity: DIM + (1 - DIM) * light };
  });
  return <Animated.Text style={[style, animated]}>{char}</Animated.Text>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', overflow: 'hidden' },
});
