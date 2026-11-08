import { useEffect } from 'react';
import { useUnistyles } from 'react-native-unistyles';

/** 让浏览器自带的部分（滚动条、表单控件、过度滚动露出的底色）跟着应用主题走 */
export function ThemeEffects() {
  const { theme, rt } = useUnistyles();
  const scheme = rt.themeName === 'dark' ? 'dark' : 'light';

  useEffect(() => {
    const root = document.documentElement;
    root.style.colorScheme = scheme;
    root.style.backgroundColor = theme.colors.bg;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.colors.bg);
  }, [scheme, theme.colors.bg]);

  return null;
}
