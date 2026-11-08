import type { AppTheme } from '../../ui/theme';

/** 会话颜色标记：服务端存的是旧前端定下的这几个色值，界面按名字取主题里的颜色 */
export const DIALOG_COLORS = [
  { name: 'yellow', value: '#fffae6' },
  { name: 'blue', value: '#e5f5ff' },
  { name: 'green', value: '#ecffe5' },
  { name: 'pink', value: '#ffeaee' },
  { name: 'purple', value: '#f6ecff' },
] as const;

export type DialogColorName = (typeof DIALOG_COLORS)[number]['name'];

const MARK_TOKENS = {
  yellow: 'markYellow',
  blue: 'markBlue',
  green: 'markGreen',
  pink: 'markPink',
  purple: 'markPurple',
} as const satisfies Record<DialogColorName, keyof AppTheme['colors']>;

export function colorName(value: string | null | undefined): DialogColorName | undefined {
  if (!value) return undefined;
  const v = value.toLowerCase();
  return DIALOG_COLORS.find((c) => c.value === v)?.name;
}

/** 行底色；没标颜色或不认识的值返回 undefined */
export function markBackground(theme: AppTheme, value: string | null | undefined): string | undefined {
  const name = colorName(value);
  return name ? theme.colors[MARK_TOKENS[name]] : undefined;
}
