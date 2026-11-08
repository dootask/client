import { UnistylesRuntime, useUnistyles } from 'react-native-unistyles';

/** 跟随系统，或固定浅色 / 深色 */
export type ThemeMode = 'system' | 'light' | 'dark';

export const THEME_MODES: readonly ThemeMode[] = ['system', 'light', 'dark'];

/** 立即生效：只用 StyleSheet.create 的组件不重渲染，由 unistyles 直接改样式 */
export function setThemeMode(mode: ThemeMode): void {
  if (mode === 'system') {
    UnistylesRuntime.setAdaptiveThemes(true);
    return;
  }
  UnistylesRuntime.setAdaptiveThemes(false);
  UnistylesRuntime.setTheme(mode);
}

export function useThemeMode(): ThemeMode {
  const { rt } = useUnistyles();
  return rt.hasAdaptiveThemes ? 'system' : (rt.themeName ?? 'light');
}

