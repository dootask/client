import { Globe } from 'lucide-react-native';
import { Text } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { LANGUAGES, useLanguage, useT } from '../../i18n';
import { Icon } from '../../ui/Icon';
import { Menu, type MenuEntry } from '../../ui/popover';
import { changeLanguage } from './preferences';

/** 切换语言的下拉菜单（登录前的页面用）：地球图标 + 当前语言名，点开选语言 */
export function LanguageMenu() {
  const t = useT();
  const { theme } = useUnistyles();
  const language = useLanguage();
  const current = LANGUAGES.find((item) => item.code === language);
  const items: MenuEntry[] = LANGUAGES.map((item) => ({
    label: item.name,
    checked: item.code === language,
    onSelect: () => void changeLanguage(item.code),
  }));
  return (
    <Menu items={items} accessibilityLabel={t('setting:language.title')} style={({ pressed, hovered }) => styles.trigger(pressed, hovered)}>
      <Icon icon={Globe} color={theme.colors.text2} size={theme.size.iconSmall} />
      <Text style={styles.label}>{current?.name}</Text>
    </Menu>
  );
}

const styles = StyleSheet.create((theme) => ({
  trigger: (pressed: boolean, hovered: boolean) => ({
    height: theme.size.touch,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.pill,
    opacity: pressed ? theme.opacity.pressedIcon : 1,
    backgroundColor: hovered ? theme.colors.hover : 'transparent',
  }),
  label: {
    ...theme.typography.subhead,
    color: theme.colors.text2,
  },
}));
