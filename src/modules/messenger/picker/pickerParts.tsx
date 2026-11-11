import { ChevronRight, ChevronUp, type LucideIcon, X } from 'lucide-react-native';
import { memo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import { type AvatarSize, DialogAvatar, UserAvatar } from '../../../ui/Avatar';
import { CheckMark } from '../../../ui/CheckMark';
import { Icon } from '../../../ui/Icon';
import { Sheet } from '../../../ui/layout';
import { Touchable } from '../../../ui/Touchable';
import { isGroup, pickKey, pickName, type Picked } from './pickerData';

/** 底部已选头像串最多几个，多的显示 +N */
const STACK_MAX = 3;

export function PickAvatar({ item, size }: { item: Picked; size: AvatarSize }) {
  return isGroup(item) ? (
    <DialogAvatar uri={item.avatar} groupType={item.groupType} size={size} />
  ) : (
    <UserAvatar uri={item.userimg} userid={item.userid} name={item.nickname} bot={item.bot} size={size} />
  );
}

/** 副标题：人为部门等，群为人数 */
function usePickSub(item: Picked): string {
  const t = useT();
  return isGroup(item) ? t('messenger:picker.people', { n: item.people }) : item.sub;
}

/** 名字里的关键词用主色标出 */
function Highlight({ text, word }: { text: string; word: string }) {
  const index = word ? text.toLowerCase().indexOf(word.toLowerCase()) : -1;
  if (index < 0) return text;
  return (
    <>
      {text.slice(0, index)}
      <Text style={styles.hit}>{text.slice(index, index + word.length)}</Text>
      {text.slice(index + word.length)}
    </>
  );
}

/** 一个人或群：选中整行铺浅主色 */
export const PickRow = memo(function PickRow({ item, word, on, onToggle }: { item: Picked; word: string; on: boolean; onToggle: (item: Picked) => void }) {
  const sub = usePickSub(item);
  return (
    <Touchable accessibilityRole="checkbox" aria-checked={on} onPress={() => onToggle(item)} style={({ pressed }) => styles.row(on, pressed)}>
      <View style={styles.rowMain}>
        <PickAvatar item={item} size={40} />
        <View style={styles.texts}>
          <Text style={styles.name} numberOfLines={1}>
            <Highlight text={pickName(item)} word={word} />
          </Text>
          {!!sub && (
            <Text style={styles.sub} numberOfLines={1}>
              {sub}
            </Text>
          )}
        </View>
      </View>
      <CheckMark checked={on} />
    </Touchable>
  );
});

/** 已选人数角标 */
function Badge({ count }: { count: number }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count}</Text>
    </View>
  );
}

/** 方形彩色图块 */
function Tile({ icon, color, size }: { icon: LucideIcon; color: string; size: number }) {
  const { theme } = useUnistyles();
  return (
    <View style={styles.tile(size, color)}>
      <Icon icon={icon} color={theme.palette.onTile} size={Math.round(size * 0.55)} />
    </View>
  );
}

/** 部门或项目：点进去是它的成员 */
export const SourceRow = memo(function SourceRow({ sourceKey, name, count, badge, icon, color, level, word, onOpen }: {
  sourceKey: string;
  name: string;
  count: number;
  badge: number;
  icon: LucideIcon;
  color: string;
  level: number;
  word: string;
  onOpen: (key: string) => void;
}) {
  const t = useT();
  const { theme } = useUnistyles();
  return (
    <Touchable accessibilityRole="button" onPress={() => onOpen(sourceKey)} style={({ pressed }) => styles.row(false, pressed)}>
      <View style={[styles.rowMain, styles.indent(level)]}>
        <Tile icon={icon} color={color} size={theme.size.pickTile} />
        <View style={styles.texts}>
          <Text style={styles.name} numberOfLines={1}>
            <Highlight text={name} word={word} />
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {t('messenger:picker.people', { n: count })}
          </Text>
        </View>
      </View>
      {badge > 0 && <Badge count={badge} />}
      <Icon icon={ChevronRight} color={theme.colors.text4} size={theme.size.iconSmall} />
    </Touchable>
  );
});

export interface Entry {
  key: string;
  name: string;
  icon: LucideIcon;
  color: string;
  count?: number;
  badge: number;
}

/** 首页入口：全部成员、按部门、按项目 */
export function EntryPanel({ entries, onPress }: { entries: Entry[]; onPress: (key: string) => void }) {
  const { theme } = useUnistyles();
  return (
    <View style={styles.panel}>
      {entries.map((entry, index) => (
        <Touchable key={entry.key} accessibilityRole="button" onPress={() => onPress(entry.key)} style={({ pressed }) => styles.entry(pressed)}>
          <Tile icon={entry.icon} color={entry.color} size={theme.size.pickEntryTile} />
          <View style={styles.entryMain(index > 0)}>
            <Text style={[styles.name, styles.grow]} numberOfLines={1}>
              {entry.name}
            </Text>
            {entry.badge > 0 ? <Badge count={entry.badge} /> : entry.count !== undefined && <Text style={styles.count}>{entry.count}</Text>}
            <Icon icon={ChevronRight} color={theme.colors.text4} size={theme.size.iconSmall} />
          </View>
        </Touchable>
      ))}
    </View>
  );
}

/** 分节标题 */
export const SectionHeader = memo(function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.header}>
      <Text style={styles.headerText}>{title}</Text>
    </View>
  );
});

/** 成员页顶部：人数和已选数 */
export function MemberBar({ text }: { text: string }) {
  return (
    <View style={styles.memberBar}>
      <Text style={[styles.sub, styles.grow]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

/** 底部栏：已选头像串（点开已选列表）和「确定」 */
export function PickerFooter({ selected, max, onOpen, onSubmit }: { selected: Picked[]; max: number; onOpen: () => void; onSubmit: () => void }) {
  const t = useT();
  const { theme } = useUnistyles();
  const recent = selected.slice(-STACK_MAX).reverse();
  const more = selected.length - recent.length;
  const has = selected.length > 0;
  const label = has ? `${t('messenger:picker.selected')} ${selected.length} / ${max}` : t('messenger:picker.maxItems', { n: max });
  return (
    <View style={styles.footer}>
      <Touchable accessibilityRole="button" disabled={!has} onPress={onOpen} hitSlop={theme.spacing.sm} style={({ pressed }) => styles.stackWrap(pressed)}>
        {has && (
          <View style={styles.stack}>
            {recent.map((item, index) => (
              <View key={pickKey(item)} style={[styles.stackItem, index > 0 && styles.overlap]}>
                <PickAvatar item={item} size={32} />
              </View>
            ))}
            {more > 0 && (
              <View style={[styles.stackItem, styles.overlap, styles.more]}>
                <Text style={styles.moreText} allowFontScaling={false}>{`+${more}`}</Text>
              </View>
            )}
          </View>
        )}
        <Text style={styles.stackText(has)} numberOfLines={1}>
          {label}
        </Text>
        {has && <Icon icon={ChevronUp} color={theme.colors.text3} size={theme.size.iconTiny + 2} />}
      </Touchable>
      <Touchable accessibilityRole="button" disabled={!has} onPress={onSubmit} style={({ pressed }) => styles.submit(has, pressed)}>
        <Text style={styles.submitText(has)}>{t('confirm')}</Text>
      </Touchable>
    </View>
  );
}

/** 已选列表（右上「清空」，下拉或点外面关）：逐个移出或清空，移空后自动收起 */
export function SelectedSheet({ visible, selected, max, onRemove, onClear, onClose }: {
  visible: boolean;
  selected: Picked[];
  max: number;
  onRemove: (key: string) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const t = useT();
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={`${t('messenger:picker.selected')} ${selected.length} / ${max}`}
      left={<View />}
      confirm={{
        label: t('messenger:picker.clear'),
        onPress: () => {
          onClear();
          onClose();
        },
      }}
    >
      <ScrollView>
        {selected
          .slice()
          .reverse()
          .map((item) => (
            <SelectedRow key={pickKey(item)} item={item} onRemove={onRemove} />
          ))}
      </ScrollView>
    </Sheet>
  );
}

function SelectedRow({ item, onRemove }: { item: Picked; onRemove: (key: string) => void }) {
  const t = useT();
  const { theme } = useUnistyles();
  const sub = usePickSub(item);
  return (
    <View style={styles.row(false, false)}>
      <View style={styles.rowMain}>
        <PickAvatar item={item} size={40} />
        <View style={styles.texts}>
          <Text style={styles.name} numberOfLines={1}>
            {pickName(item)}
          </Text>
          {!!sub && (
            <Text style={styles.sub} numberOfLines={1}>
              {sub}
            </Text>
          )}
        </View>
      </View>
      <Touchable
        accessibilityRole="button"
        accessibilityLabel={t('messenger:chat.delete')}
        onPress={() => onRemove(pickKey(item))}
        hitSlop={theme.spacing.sm}
        style={({ pressed }) => styles.remove(pressed)}
      >
        <Icon icon={X} color={theme.colors.text2} size={theme.size.iconTiny + 2} />
      </Touchable>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: (on: boolean, pressed: boolean) => ({
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    height: theme.size.rowDouble,
    paddingHorizontal: theme.spacing.page,
    backgroundColor: pressed ? theme.colors.fillPressed : on ? theme.colors.rowHighlight : 'transparent',
  }),
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  indent: (level: number) => ({ paddingLeft: Math.min(level, 3) * theme.spacing.lg }),
  texts: { flex: 1, gap: theme.size.pickTextGap },
  grow: { flex: 1 },
  name: { ...theme.typography.body, color: theme.colors.text },
  sub: { ...theme.typography.footnote, color: theme.colors.text3 },
  hit: { color: theme.colors.primaryText },
  badge: {
    minWidth: theme.size.pickBadge,
    height: theme.size.pickBadge,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primarySoft,
  },
  badgeText: { ...theme.typography.caption, fontWeight: '600', color: theme.colors.primaryText },
  tile: (size: number, color: string) => ({ width: size, height: size, borderRadius: size / 4, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }),
  panel: {
    marginHorizontal: theme.spacing.page,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.md,
    borderRadius: theme.radius.card,
    overflow: 'hidden',
    backgroundColor: theme.colors.fill,
  },
  entry: (pressed: boolean) => ({
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingLeft: theme.spacing.md,
    backgroundColor: pressed ? theme.colors.fillPressed : 'transparent',
  }),
  entryMain: (divided: boolean) => ({
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    height: theme.size.pickEntry,
    paddingRight: theme.spacing.md,
    borderTopWidth: divided ? StyleSheet.hairlineWidth : 0,
    borderTopColor: theme.colors.separator,
  }),
  count: { ...theme.typography.subhead, color: theme.colors.text3 },
  header: { height: theme.size.pickHeader, justifyContent: 'center', paddingHorizontal: theme.spacing.page, backgroundColor: theme.colors.surface },
  headerText: { ...theme.typography.footnoteStrong, color: theme.colors.text3 },
  memberBar: { flexDirection: 'row', alignItems: 'center', height: theme.size.pickBar, paddingHorizontal: theme.spacing.page },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.page,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.separator,
    backgroundColor: theme.colors.surface,
  },
  stackWrap: (pressed: boolean) => ({
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    minHeight: theme.size.pickBar,
    opacity: pressed ? theme.opacity.pressedIcon : 1,
  }),
  stack: { flexDirection: 'row' },
  stackItem: { borderWidth: theme.size.pickStackRing, borderColor: theme.colors.surface, borderRadius: theme.radius.pill },
  overlap: { marginLeft: -theme.size.pickStackOverlap },
  more: {
    width: theme.size.avatar.md + theme.size.pickStackRing * 2,
    height: theme.size.avatar.md + theme.size.pickStackRing * 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.fill,
  },
  moreText: { ...theme.typography.caption, fontWeight: '600', color: theme.colors.text2 },
  stackText: (has: boolean) => ({ ...theme.typography.subhead, flexShrink: 1, color: has ? theme.colors.text : theme.colors.text3 }),
  submit: (on: boolean, pressed: boolean) => ({
    height: theme.size.pickBar,
    minWidth: theme.size.pickSubmit,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: on ? theme.colors.primary : theme.colors.fill,
    opacity: pressed ? theme.opacity.pressedPrimary : 1,
  }),
  submitText: (on: boolean) => ({ ...theme.typography.callout, fontWeight: '600', color: on ? theme.colors.onPrimary : theme.colors.text4 }),
  remove: (pressed: boolean) => ({
    width: theme.size.pickRemove,
    height: theme.size.pickRemove,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.fill,
    opacity: pressed ? theme.opacity.pressedIcon : 1,
  }),
}));
