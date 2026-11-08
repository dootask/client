import { TabTrigger, type TabTriggerSlotProps } from 'expo-router/ui';
import { Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../i18n';
import { Icon } from '../../ui/Icon';
import type { NavVariant } from '../../ui/layout';
import { Touchable } from '../../ui/Touchable';
import { MAIN_TABS, type MainTab, SETTINGS_TAB } from './tabs';

/** 主框架的导航，三种形态共用同一份 Tab 数据；切换靠 expo-router 的无头 Tabs，URL 和形态无关 */
export function MainNav({ variant }: { variant: NavVariant }) {
  if (variant === 'tabs') {
    return (
      <View style={styles.tabs}>
        {MAIN_TABS.map((tab) => (
          <TabTrigger key={tab.name} name={tab.name} asChild>
            <NavItem tab={tab} variant={variant} />
          </TabTrigger>
        ))}
      </View>
    );
  }
  return (
    <View style={styles.side}>
      {variant === 'sidebar' && <Text style={styles.brand}>DooTask</Text>}
      <View style={[styles.sideList(variant), styles.grow]}>
        {MAIN_TABS.map((tab) => (
          <TabTrigger key={tab.name} name={tab.name} asChild>
            <NavItem tab={tab} variant={variant} />
          </TabTrigger>
        ))}
      </View>
      <View style={styles.sideList(variant)}>
        <TabTrigger name={SETTINGS_TAB.name} asChild>
          <NavItem tab={SETTINGS_TAB} variant={variant} />
        </TabTrigger>
      </View>
    </View>
  );
}

function NavItem({ tab, variant, isFocused = false, ...trigger }: TabTriggerSlotProps & { tab: MainTab; variant: NavVariant }) {
  const t = useT();
  const { theme } = useUnistyles();
  const label = t(tab.label);
  const color = isFocused ? theme.colors.primaryText : theme.colors.text2;
  return (
    <Touchable
      {...trigger}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: isFocused }}
      style={({ pressed, hovered }) => styles.item(variant, isFocused, pressed, hovered)}
    >
      <Icon icon={tab.icon} color={color} size={variant === 'sidebar' ? theme.size.iconSmall : theme.size.icon} />
      {variant !== 'rail' && (
        <Text style={styles.label(variant, isFocused)} numberOfLines={1}>
          {label}
        </Text>
      )}
    </Touchable>
  );
}

const styles = StyleSheet.create((theme) => ({
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
