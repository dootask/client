import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { useUnistyles } from 'react-native-unistyles';

/** 系统界面跟着应用主题走（手动选了深色时，状态栏文字也要变白） */
export function ThemeEffects() {
  const { theme, rt } = useUnistyles();
  const dark = rt.themeName === 'dark';

  useEffect(() => {
    // 根视图底色：切页动画、键盘弹出时露出来的部分
    void SystemUI.setBackgroundColorAsync(theme.colors.bg);
  }, [theme.colors.bg]);

  return <StatusBar style={dark ? 'light' : 'dark'} />;
}
