import { TabTrigger, type TabTriggerSlotProps } from 'expo-router/ui';
import { Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../i18n';
import { Icon } from '../../ui/Icon';
import type { NavVariant } from '../../ui/layout';
import { Touchable } from '../../ui/Touchable';
import { MAIN_TABS, type MainTab, SETTINGS_TAB } from './tabs';

export interface MainNavProps {
  variant: NavVariant;
  /** 各 Tab 的红点文字（按路由名），空串不显示 */
  badges?: Partial<Record<string, string>>;
  /** 点已选中的 Tab */
  onReselect?: (name: string) => void;
}

/** 主框架的导航，三种形态共用同一份 Tab 数据；切换靠 expo-router 的无头 Tabs，URL 和形态无关 */
export function MainNav({ variant, badges, onReselect }: MainNavProps) {
  const item = (tab: MainTab) => (
    <TabTrigger key={tab.name} name={tab.name} asChild>
      <NavItem tab={tab} variant={variant} badge={badges?.[tab.name] ?? ''} onReselect={onReselect} />
    </TabTrigger>
  );
  if (variant === 'tabs') {
    return (
      <View style={styles.tabs}>
        {MAIN_TABS.map(item)}
      </View>
    );
  }
  return (
    <View style={styles.side}>
      {variant === 'sidebar' && <Text style={styles.brand}>DooTask</Text>}
      <View style={[styles.sideList(variant), styles.grow]}>
        {MAIN_TABS.map(item)}
      </View>
      <View style={styles.sideList(variant)}>
        {item(SETTINGS_TAB)}
      </View>
    </View>
  );
}

function NavItem({
  tab,
  variant,
  badge,
  onReselect,
  isFocused = false,
  onPress,
  ...trigger
}: Omit<TabTriggerSlotProps, 'ref'> & { tab: MainTab; variant: NavVariant; badge: string; onReselect?: (name: string) => void }) {
  const t = useT();
  const { theme } = useUnistyles();
  const label = t(tab.label);
  const color = isFocused ? theme.colors.primaryText : theme.colors.text2;
  return (
    <Touchable
      {...trigger}
      onPress={(event) => {
        // 再点已选中的 Tab 只交给 onReselect，不让无头 Tabs 重新导航（会关掉右侧已打开的详情）
        if (isFocused) {
          event.preventDefault();
          onReselect?.(tab.name);
        }
        onPress?.(event);
      }}
      accessibilityRole="tab"
      accessibilityLabel={label}
      aria-selected={isFocused}
      style={({ pressed, hovered }) => styles.item(variant, isFocused, pressed, hovered)}
    >
      <View>
        <Icon icon={tab.icon} color={color} size={variant === 'sidebar' ? theme.size.iconSmall : theme.size.icon} />
        {!!badge && variant !== 'sidebar' && <NavBadge text={variant === 'rail' ? badge.split('·')[0]! : badge} floating />}
      </View>
      {variant !== 'rail' && (
        <Text style={styles.label(variant, isFocused)} numberOfLines={1}>
          {label}
        </Text>
      )}
      {!!badge && variant === 'sidebar' && <NavBadge text={badge} />}
    </Touchable>
  );
}

/** Tab 红点：窄屏和图标侧栏浮在图标右上角，完整侧栏在行尾；图标侧栏太窄，只显示第一段（「12·待办3」显示「12」） */
function NavBadge({ text, floating = false }: { text: string; floating?: boolean }) {
  return (
    <View style={[styles.badge, floating && styles.badgeFloating]}>
      <Text style={styles.badgeText} allowFontScaling={false} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  badge: {
    minWidth: theme.size.badge,
    height: theme.size.badge,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.badge,
  },
  badgeFloating: {
    position: 'absolute',
    top: -theme.spacing.xs,
    left: theme.size.icon - theme.spacing.sm,
  },
  badgeText: {
    ...theme.typography.caption2,
    color: theme.colors.onPrimary,
  },
  tabs: {
    height: theme.size.tabBar,
    flexDirection: 'row',
  },
  side: {
    flex: 1,
    paddingVertical: theme.spacing.md,
  },
  brand: {
    ...theme.typography.title2,
    color: theme.colors.text,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  // 主导航占满中间，设置沉到底部
  grow: {
    flex: 1,
  },
  sideList: (variant: NavVariant) => ({
    gap: theme.spacing.xs,
    paddingHorizontal: variant === 'sidebar' ? theme.spacing.sm : theme.spacing.md,
  }),
  item: (variant: NavVariant, focused: boolean, pressed: boolean, hovered: boolean) => {
    const background = focused && variant !== 'tabs' ? theme.colors.primarySoft : hovered ? theme.colors.hover : 'transparent';
    const opacity = pressed ? theme.opacity.pressedIcon : 1;
    if (variant === 'tabs') {
      return { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.xs / 2, opacity, backgroundColor: background };
    }
    if (variant === 'rail') {
      return { height: theme.size.touch, borderRadius: theme.radius.block, alignItems: 'center', justifyContent: 'center', opacity, backgroundColor: background };
    }
    return {
      height: theme.size.touch - theme.spacing.xs,
      borderRadius: theme.radius.block,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      opacity,
      backgroundColor: background,
    };
  },
  label: (variant: NavVariant, focused: boolean) => ({
    ...(variant === 'tabs' ? theme.typography.caption2 : theme.typography.callout),
    color: focused ? theme.colors.primaryText : variant === 'tabs' ? theme.colors.text2 : theme.colors.text,
    fontWeight: focused ? '600' : variant === 'tabs' ? '500' : '400',
  }),
}));
