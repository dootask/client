import { Check, ChevronRight } from 'lucide-react-native';
import { PixelRatio, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Icon, type LucideIcon } from './Icon';
import { Touchable } from './Touchable';

export interface ListRowProps {
  title: string;
  icon?: LucideIcon;
  /** 右侧：箭头（进入下一级）或打勾（单选） */
  accessory?: 'chevron' | 'check' | 'none';
  /** 当前选中的行（并排视图里正在右侧显示的那一项） */
  selected?: boolean;
  onPress: () => void;
}

/** 列表行（docs/ui-spec.md 第 5 节）：单行高 52，按下 / 悬停有底色，分隔线从文字左缘开始 */
export function ListRow({ title, icon, accessory = 'none', selected = false, onPress }: ListRowProps) {
  const { theme } = useUnistyles();
  return (
    <Touchable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed, hovered }) => styles.row(selected, pressed, hovered)}
    >
      {icon && <Icon icon={icon} color={theme.colors.text2} size={theme.size.icon} />}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {accessory === 'chevron' && <Icon icon={ChevronRight} color={theme.colors.text4} size={theme.size.iconSmall} />}
        {accessory === 'check' && <Icon icon={Check} color={theme.colors.primaryText} size={theme.size.icon} />}
      </View>
    </Touchable>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: (selected: boolean, pressed: boolean, hovered: boolean) => ({
    // 行高对齐到整像素：非整数密度（如 2.625）下相邻行取整会重叠 1px，盖住上一行的细分割线
    minHeight: PixelRatio.roundToNearestPixel(theme.size.rowSingle),
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingLeft: theme.spacing.page,
    backgroundColor: pressed ? theme.colors.fillPressed : selected ? theme.colors.rowHighlight : hovered ? theme.colors.hover : theme.colors.surface,
  }),
  body: {
    flex: 1,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingRight: theme.spacing.page,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.separator,
  },
  title: {
    ...theme.typography.callout,
    flex: 1,
    color: theme.colors.text,
  },
}));
