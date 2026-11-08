import { StyleSheet } from 'react-native-unistyles';

import { breakpoints, darkTheme, lightTheme } from './tokens';

type AppBreakpoints = typeof breakpoints;
type AppThemes = { light: typeof lightTheme; dark: typeof darkTheme };

// 让 StyleSheet.create((theme, rt) => …) 里的 theme 和断点有类型
declare module 'react-native-unistyles' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface UnistylesThemes extends AppThemes {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface UnistylesBreakpoints extends AppBreakpoints {}
}

// 必须在任何 StyleSheet.create 之前执行：由入口文件 index.ts 第一个导入。
// 默认跟随系统深浅色，用户选过之后由 setThemeMode 切成手动
StyleSheet.configure({
  themes: { light: lightTheme, dark: darkTheme },
  breakpoints,
  settings: { adaptiveThemes: true },
});
