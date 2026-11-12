import { ChevronRight } from 'lucide-react-native';
import { Children, Fragment, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { Icon, type LucideIcon } from './Icon';
import { Switch } from './Switch';
import { Touchable } from './Touchable';

/**
 * App 设置、资料页的一组（同旧版 App ListSection）：通栏白底，与上一块之间隔一条底色带，
 * 行间发丝线内缩到文字左缘。icons：组内的行带左侧图标（决定分隔线内缩）；
 * hint：标题是表单的填写提示（如「请选择举报类型」），灰色小字；first：页面第一组，不要顶部的底色带
 */
export function ListSection({ title, footer, icons = false, hint = false, first = false, children }: {
  title?: string;
  footer?: string;
  icons?: boolean;
  hint?: boolean;
  first?: boolean;
  children: ReactNode;
}) {
  const rows = Children.toArray(children);
  if (rows.length === 0) return null;
  return (
    <View style={styles.section(first)}>
      {!!title && <Text style={hint ? styles.hint : styles.title} numberOfLines={1}>{title}</Text>}
      {rows.map((row, index) => (
        <Fragment key={index}>
          {index > 0 && <View style={styles.separator(icons)} />}
          {row}
        </Fragment>
      ))}
      {!!footer && <Text style={styles.footer}>{footer}</Text>}
    </View>
  );
}

/** 底部弹层里组与组之间的底色带：与 ListSection 顶部的带同高同色；只放在两组之间，首尾不放 */
export function GroupBand() {
  return <View style={styles.band} />;
}

/**
 * 分组里的行（同旧版 App ListRow）：左侧图标，主 / 副文字，右侧值、开关、箭头之一。
 * 有 onSwitch 为开关行（点整行也切换）；danger 为红字的危险操作（没有图标时居中）
 */
export function ListItem({ icon, label, detail, value, trailing, chevron = false, switchValue, onSwitch, danger = false, disabled = false, onPress, onLongPress }: {
  icon?: LucideIcon;
  label: string;
  detail?: string;
  value?: string;
  /** 值左侧的附加内容（如颜色点） */
  trailing?: ReactNode;
  chevron?: boolean;
  switchValue?: boolean;
  onSwitch?: (value: boolean) => void;
  danger?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}) {
  const { theme } = useUnistyles();
  const press = onPress ?? (onSwitch ? () => onSwitch(!switchValue) : undefined);
  const tone = disabled ? theme.colors.text4 : danger ? theme.colors.danger : undefined;
  return (
    <Touchable disabled={disabled || (!press && !onLongPress)} onPress={press} onLongPress={onLongPress} style={({ pressed }) => styles.row(!!detail, pressed)}>
      {icon && <Icon icon={icon} color={tone ?? theme.colors.text2} size={theme.size.icon} />}
      <View style={styles.texts}>
        <Text style={styles.label(tone, danger && !icon)} numberOfLines={1}>{label}</Text>
        {!!detail && <Text style={styles.detail} numberOfLines={2}>{detail}</Text>}
      </View>
      {trailing}
      {!!value && <Text style={styles.value} numberOfLines={1}>{value}</Text>}
      {onSwitch && <Switch value={!!switchValue} disabled={disabled} onValueChange={onSwitch} />}
      {chevron && <Icon icon={ChevronRight} color={theme.colors.text4} size={theme.size.iconSmall} />}
    </Touchable>
  );
}

const styles = StyleSheet.create((theme) => ({
  section: (first: boolean) => ({
    borderTopWidth: first ? 0 : theme.spacing.sm,
    borderTopColor: theme.colors.bg,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.surface,
  }),
  band: { height: theme.spacing.sm, marginVertical: theme.spacing.xs, backgroundColor: theme.colors.bg },
  title: { ...theme.typography.sectionTitle, marginHorizontal: theme.spacing.page, marginTop: theme.spacing.sm, marginBottom: theme.spacing.xs, color: theme.colors.text },
  hint: { ...theme.typography.footnote, marginHorizontal: theme.spacing.page, marginTop: theme.spacing.sm, marginBottom: theme.spacing.xs, color: theme.colors.text3 },
  footer: { ...theme.typography.footnote, marginHorizontal: theme.spacing.page, marginTop: theme.spacing.xs, marginBottom: theme.spacing.sm, color: theme.colors.text3 },
  // 分隔线从文字左缘开始：行左内边距，带图标时再加图标和间距
  separator: (icons: boolean) => ({
    height: StyleSheet.hairlineWidth,
    marginLeft: theme.spacing.lg + (icons ? theme.size.icon + theme.spacing.md : 0),
    backgroundColor: theme.colors.separator,
  }),
  row: (double: boolean, pressed: boolean) => ({
    minHeight: double ? theme.size.rowDouble : theme.size.rowSingle,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: pressed ? theme.colors.fillPressed : undefined,
  }),
  texts: { flex: 1, gap: theme.size.listLineGap },
  label: (tone: string | undefined, center: boolean) => ({ ...theme.typography.body, color: tone ?? theme.colors.text, textAlign: center ? 'center' : undefined }),
  detail: { ...theme.typography.footnote, color: theme.colors.text3 },
  value: { ...theme.typography.callout, maxWidth: '50%', color: theme.colors.text3 },
}));
