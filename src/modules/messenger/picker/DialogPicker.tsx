import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { Building2, ChevronLeft, Layers, Search } from 'lucide-react-native';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import Animated, { SlideInLeft, SlideInRight } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import { Icon } from '../../../ui/Icon';
import { LetterIndex } from '../../../ui/LetterIndex';
import { Sheet } from '../../../ui/layout';
import { SearchField } from '../../../ui/SearchField';
import { Touchable } from '../../../ui/Touchable';
import { pickKey, type Picked } from './pickerData';
import { EntryPanel, MemberBar, PickerFooter, PickRow, SectionHeader, SelectedSheet, SourceRow } from './pickerParts';
import { isMemberKey, type MemberPickerOptions, type PageKey, type PickerRow, usePicker } from './usePicker';

const PAGE_SLIDE = 250;

const rowKey = (row: PickerRow) => row.id;
const rowType = (row: PickerRow) => row.type;

/**
 * 选会话（转发，旧版 App 的 UserPicker 选会话模式）：首页是入口（全部成员、按部门、按项目）和最近会话，逐级点进成员列表，
 * 任何一级都能搜（成员、最近会话里的群、部门和项目）。人和群都能选，最多 max 个；点「确定」交给 onSubmit，弹层不关。
 * 返回键、下拉、点遮罩先退出搜索、退回上一级
 */
type DialogPickerProps = {
  visible: boolean;
  title: string;
  max: number;
  onSubmit: (picked: Picked[]) => void;
  onClose: () => void;
} & MemberPickerOptions;

export function DialogPicker(props: DialogPickerProps) {
  return props.visible ? <PickerContent {...props} /> : null;
}

function PickerContent({ visible, title, max, onSubmit, onClose, ...options }: DialogPickerProps) {
  const t = useT();
  const { theme } = useUnistyles();
  const picker = usePicker({ title, max, root: 'home', flat: false, ...options });
  const { selected, selectedKeys, toggle, pages, page, depth, word, view, openSource, titleOf } = picker;
  const [showSelected, setShowSelected] = useState(false);
  const listRef = useRef<FlashListRef<PickerRow>>(null);
  const emptyText = { '': '', none: t('none'), failed: t('loadFailed'), notFound: t('messenger:picker.notFound', { key: word }) }[view.empty];
  const memberBar = picker.memberInfo
    ? `${t('messenger:picker.people', { n: picker.memberInfo.total })}${picker.memberInfo.count > 0 ? ` · ${t('messenger:picker.selected')} ${picker.memberInfo.count}` : ''}`
    : null;

  const letters = view.letters ? view.rows.flatMap((row) => row.type === 'header' ? [row.title] : []) : [];
  const onLetter = useCallback((letter: string) => {
    const index = view.rows.findIndex((row) => row.type === 'header' && row.title === letter);
    if (index >= 0) void listRef.current?.scrollToIndex({ index, animated: false });
  }, [view.rows]);

  // 返回键、下拉、点遮罩：先退出搜索、退回上一级
  const back = () => {
    if (word) picker.setKey('');
    else if (depth > 1) picker.pop();
    else onClose();
  };

  const renderItem = useCallback(
    ({ item }: { item: PickerRow }) => {
      if (item.type === 'header') return <SectionHeader title={item.title} />;
      if (item.type === 'source') {
        return (
          <SourceRow
            sourceKey={item.key}
            name={item.name}
            count={item.count}
            badge={item.badge}
            icon={item.project ? Layers : Building2}
            color={item.color}
            level={item.level}
            word={word}
            onOpen={openSource}
          />
        );
      }
      return <PickRow item={item.item} word={word} on={selectedKeys.has(pickKey(item.item))} disabled={picker.disabledKeys.has(pickKey(item.item))} onToggle={toggle} />;
    },
    [word, selectedKeys, toggle, openSource, picker.disabledKeys],
  );

  const homeHeader = page === 'home' && !word;
  return (
    <>
      <Sheet
        visible={visible}
        onClose={back}
        title={word ? t('messenger:search') : titleOf(page)}
        fill
        left={
          word || depth > 1 ? (
            <Touchable accessibilityRole="button" onPress={back} hitSlop={theme.spacing.sm} style={({ pressed }) => styles.back(pressed)}>
              <Icon icon={ChevronLeft} color={theme.colors.text2} size={theme.size.icon} />
              <Text style={styles.backText} numberOfLines={1}>
                {titleOf(word ? page : pages.stack[depth - 2]!)}
              </Text>
            </Touchable>
          ) : (
            <Touchable accessibilityRole="button" onPress={onClose} hitSlop={theme.spacing.sm} style={({ pressed }) => styles.back(pressed)}>
              <Text style={styles.backText}>{t('cancel')}</Text>
            </Touchable>
          )
        }
      >
        <View style={styles.search}>
          <SearchField value={picker.key} onChangeText={picker.setKey} placeholder={t('messenger:picker.searchDialogs')} clearLabel={t('clear')} />
        </View>
        <Animated.View
          key={word ? 'search' : `${depth}-${page}`}
          entering={word || pages.move === 'open' ? undefined : (pages.move === 'back' ? SlideInLeft : SlideInRight).duration(PAGE_SLIDE)}
          style={styles.page}
        >
          {memberBar !== null && <MemberBar text={memberBar} />}
          <FlashList
            ref={listRef}
            data={view.rows}
            keyExtractor={rowKey}
            getItemType={rowType}
            renderItem={renderItem}
            extraData={renderItem}
            stickyHeaderIndices={view.sticky}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            onEndReached={() => !word && isMemberKey(page) && picker.nextMembers(page)}
            onEndReachedThreshold={0.5}
            ListHeaderComponent={homeHeader ? <EntryPanel entries={picker.entries} onPress={(entry) => picker.push(entry as PageKey)} /> : undefined}
            ListFooterComponent={
              view.loading ? (
                <ActivityIndicator style={styles.loading} color={theme.colors.text3} />
              ) : emptyText ? (
                <View style={styles.empty}>
                  <Icon icon={Search} color={theme.colors.text3} size={theme.size.pickEmptyIcon} />
                  <Text style={styles.emptyText}>{emptyText}</Text>
                </View>
              ) : undefined
            }
            contentContainerStyle={letters.length > 0 ? styles.withIndex : undefined}
          />
          <LetterIndex letters={letters} onSelect={onLetter} />
        </Animated.View>
        <PickerFooter selected={selected} max={max} onOpen={() => setShowSelected(true)} onSubmit={() => onSubmit(selected)} />
      </Sheet>
      <SelectedSheet
        visible={visible && showSelected}
        selected={selected}
        max={max}
        onRemove={(itemKey) => {
          picker.remove(itemKey);
          if (selected.length === 1) setShowSelected(false);
        }}
        onClear={picker.clear}
        onClose={() => setShowSelected(false)}
      />
    </>
  );
}

const styles = StyleSheet.create((theme) => ({
  back: (pressed: boolean) => ({
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    minHeight: theme.size.touch,
    paddingHorizontal: theme.spacing.xs,
    opacity: pressed ? theme.opacity.pressedIcon : 1,
  }),
  backText: { ...theme.typography.callout, flexShrink: 1, color: theme.colors.text2 },
  search: { paddingHorizontal: theme.spacing.page, paddingBottom: theme.spacing.sm },
  page: { flex: 1 },
  withIndex: { paddingRight: theme.spacing.lg },
  loading: { marginVertical: theme.spacing.xxl },
  empty: { alignItems: 'center', gap: theme.spacing.sm, paddingTop: theme.size.pickEmptyTop, paddingHorizontal: theme.spacing.lg },
  emptyText: { ...theme.typography.subhead, color: theme.colors.text3 },
}));
