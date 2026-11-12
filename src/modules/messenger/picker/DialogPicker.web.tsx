import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { Building2, Check, ChevronLeft, ChevronRight, ChevronUp, Clock, Layers, type LucideIcon, Search, Users, X } from 'lucide-react-native';
import { memo, type ReactElement, type RefObject, useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';
import { ActivityIndicator, type HostInstance, ScrollView, Text, TextInput, type TextInputInstance, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import { DooButton, DooModal } from '../../../ui/DooModal';
import { Icon } from '../../../ui/Icon';
import { shortcutLabel } from '../../../ui/shortcuts';
import { Touchable } from '../../../ui/Touchable';
import { isGroup, pickKey, pickName, type Picked } from './pickerData';
import { PickAvatar } from './pickerParts';
import { isMemberKey, type PageKey, type PickerRow, type SourceItem, usePicker } from './usePicker';

const rowKey = (row: PickerRow) => row.id;
const rowType = (row: PickerRow) => row.type;

type Picker = ReturnType<typeof usePicker>;

/**
 * 选会话（Web，照旧版网页的选择成员弹窗 UserSelect 的选会话模式）。
 * 宽屏是 860×620 的三栏弹窗：左栏来源（最近会话、全部成员、各部门、各项目），中间列表，右栏已选，底部快捷键提示和取消、确定；
 * 方向键移动、回车选、退格两次移除最后一位、⌘↵ 确定，焦点不在搜索框时直接打字进搜索框。
 * 窄屏铺满整屏：首页入口逐级进入部门、项目，底部已选头像串（点开已选列表）和确定。
 * 点「确定」交给 onSubmit，弹窗不关
 */
export function DialogPicker(props: { visible: boolean; title: string; max: number; onSubmit: (picked: Picked[]) => void; onClose: () => void }) {
  // 每次打开都是新的状态
  return props.visible ? <PickerModal {...props} /> : null;
}

function PickerModal({ title, max, onSubmit, onClose }: { title: string; max: number; onSubmit: (picked: Picked[]) => void; onClose: () => void }) {
  const { rt, theme } = useUnistyles();
  const [narrow] = useState(rt.breakpoint === 'xs');
  const picker = usePicker({ title, max, root: narrow ? 'home' : 'recent', flat: !narrow });
  const [showSelected, setShowSelected] = useState(false);
  const submit = () => picker.selected.length > 0 && onSubmit(picker.selected);

  // Esc、返回键：手机上先收起已选列表、退出搜索、退回上一级
  const requestClose = () => {
    if (!narrow) onClose();
    else if (showSelected) setShowSelected(false);
    else if (picker.word) picker.setKey('');
    else if (picker.depth > 1) picker.pop();
    else onClose();
  };

  return (
    <DooModal visible onClose={requestClose} width={theme.size.usp.width} height={theme.size.usp.height} fullscreen={narrow} bare testID="dialog-picker">
      {narrow ? (
        <NarrowPicker picker={picker} max={max} showSelected={showSelected} setShowSelected={setShowSelected} onClose={onClose} onSubmit={submit} />
      ) : (
        <WidePicker picker={picker} title={title} max={max} onClose={onClose} onSubmit={submit} />
      )}
    </DooModal>
  );
}

/* ───────────────────────── 宽屏 ───────────────────────── */

function WidePicker({ picker, title, max, onClose, onSubmit }: { picker: Picker; title: string; max: number; onClose: () => void; onSubmit: () => void }) {
  const t = useT();
  const { theme } = useUnistyles();
  const { selected, page, word, view } = picker;
  const rootRef = useRef<HostInstance>(null);
  const inputRef = useRef<TextInputInstance>(null);
  const listRef = useRef<FlashListRef<PickerRow>>(null);
  // 键盘移动到的行（按可选行计）；换页、搜索时清掉
  const viewKey = word ? `s:${word}` : page;
  const [kb, setKb] = useState({ view: viewKey, index: -1 });
  const kbIndex = kb.view === viewKey ? kb.index : -1;
  // 按一次退格先框住最后一位，再按才移除
  const [chipFocus, setChipFocus] = useState(false);
  const rows = view.rows.flatMap((row, index) => (row.type === 'header' ? [] : [{ row, index }]));
  const kbId = rows[kbIndex]?.row.id ?? '';
  const last = selected[selected.length - 1];

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    const root = rootRef.current as unknown as HTMLElement | null;
    const target = event.target as HTMLElement;
    // 焦点在本弹窗这一层（含遮罩）或 body 上才管；叠在上面的弹窗（确认转发）里的按键不管
    const layer = (node: HTMLElement) => node.closest('[aria-modal="true"]');
    if (!root || (target !== document.body && layer(target) !== layer(root))) return;
    const input = inputRef.current as unknown as HTMLInputElement | null;
    const typing = event.key === 'Process' || (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey);
    if (input && target !== input && typing) {
      input.focus();
      return;
    }
    if (event.isComposing || event.key === 'Process') return;
    const move = (index: number) => {
      event.preventDefault();
      setKb({ view: viewKey, index });
      const row = rows[index];
      if (row) listRef.current?.scrollToIndex({ index: row.index, viewPosition: 0.5, animated: false });
    };
    if (event.key === 'ArrowDown') move(Math.min(rows.length - 1, kbIndex + 1));
    else if (event.key === 'ArrowUp') move(Math.max(0, kbIndex - 1));
    else if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      onSubmit();
    } else if (event.key === 'Enter' && rows[kbIndex]) {
      event.preventDefault();
      const row = rows[kbIndex].row;
      if (row.type === 'source') picker.openSource(row.key);
      else if (row.type === 'pick') picker.toggle(row.item);
    } else if (event.key === 'Backspace' && !picker.key && last) {
      if (chipFocus) picker.remove(pickKey(last));
      setChipFocus(!chipFocus);
    } else if (chipFocus) setChipFocus(false);
  });
  useEffect(() => {
    const listener = (event: KeyboardEvent) => onKeyDown(event);
    document.addEventListener('keydown', listener, true);
    return () => document.removeEventListener('keydown', listener, true);
  }, []);

  const pickerToggle = picker.toggle;
  const toggle = useCallback(
    (item: Picked) => {
      setChipFocus(false);
      pickerToggle(item);
    },
    [pickerToggle],
  );

  const renderItem = useCallback(
    ({ item }: { item: PickerRow }) => {
      if (item.type === 'header') return <GroupHeader title={item.title} narrow={false} />;
      if (item.type === 'source') return <SourceRow item={item} word={word} kb={item.id === kbId} narrow={false} onOpen={picker.openSource} />;
      return <PickRow item={item.item} word={word} on={picker.selectedKeys.has(pickKey(item.item))} kb={item.id === kbId} narrow={false} onToggle={toggle} />;
    },
    [word, kbId, picker.selectedKeys, picker.openSource, toggle],
  );

  const meta = word
    ? t('messenger:picker.items', { n: rows.length })
    : picker.memberInfo &&
      `${t('messenger:picker.people', { n: picker.memberInfo.total })}${picker.memberInfo.count > 0 && page !== 'all' ? ` · ${t('messenger:picker.selectedIn', { n: picker.memberInfo.count })}` : ''}`;

  return (
    <View ref={rootRef} style={styles.root}>
      <View style={styles.top}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <SearchBox picker={picker} inputRef={inputRef} narrow={false} />
        <Touchable accessibilityRole="button" accessibilityLabel={t('close')} onPress={onClose} style={({ hovered }) => styles.close(hovered)}>
          {({ hovered }) => <Icon icon={X} color={hovered ? theme.colors.uspText : theme.colors.uspText3} size={theme.size.usp.closeIcon} />}
        </Touchable>
      </View>

      <View style={styles.main}>
        <SideNav picker={picker} />
        <View style={styles.center}>
          <View style={styles.ch}>
            <Text style={styles.chTitle} numberOfLines={1}>{word ? t('messenger:picker.searchResults') : picker.titleOf(page)}</Text>
            {!!meta && <Text style={styles.chSub}>{meta}</Text>}
          </View>
          <PickerList picker={picker} listRef={listRef} renderItem={renderItem} extraData={renderItem} narrow={false} />
        </View>
        <SelectedPanel picker={picker} max={max} chipFocus={chipFocus} />
      </View>

      <View style={styles.foot}>
        <KeyHint keys={['↑', '↓']} label={t('messenger:picker.move')} />
        <KeyHint keys={['↵']} label={t('messenger:picker.choose')} />
        <KeyHint keys={['⌫']} label={t('messenger:picker.removeLast')} />
        <View style={styles.acts}>
          <DooButton label={t('cancel')} onPress={onClose} />
          <DooButton
            label={t('confirm')}
            primary
            disabled={selected.length === 0}
            onPress={onSubmit}
            suffix={selected.length > 0 && <Text style={[styles.kbd, styles.kbdOnPrimary]}>{shortcutLabel('mod+enter')}</Text>}
          />
        </View>
      </View>
    </View>
  );
}

/** 左栏来源：最近会话、全部成员，分组列出部门（色点）和项目；搜索时变淡不可点 */
function SideNav({ picker }: { picker: Picker }) {
  const t = useT();
  const { theme } = useUnistyles();
  const { page, word } = picker;
  const departments = picker.departmentItems();
  const projects = picker.projectItems();
  const nav = (key: PageKey, name: string, icon: LucideIcon | null, extra: { color?: string; count?: number; badge?: number; level?: number }) => {
    const on = !word && page === key;
    return (
      <Touchable key={key} accessibilityRole="button" aria-selected={on} onPress={() => picker.jump([key])} style={({ hovered }) => styles.nav(on, hovered, extra.level ?? 0)}>
        {({ hovered }) => (
          <>
            {extra.color ? <View style={[styles.navDot, { backgroundColor: extra.color }]} /> : icon && <View style={styles.navIcon}><Icon icon={icon} color={theme.colors.uspText3} size={theme.size.usp.navIcon} /></View>}
            <Text style={styles.navLabel(on, hovered)} numberOfLines={1}>{name}</Text>
            {extra.badge ? <CountBadge count={extra.badge} narrow={false} /> : extra.count !== undefined && <Text style={styles.navCount}>{extra.count}</Text>}
          </>
        )}
      </Touchable>
    );
  };
  return (
    <ScrollView style={styles.side(!!word)} contentContainerStyle={styles.sideContent} showsVerticalScrollIndicator={false} pointerEvents={word ? 'none' : 'auto'}>
      {nav('recent', t('messenger:picker.recentDialogs'), Clock, {})}
      {nav('all', t('messenger:picker.all'), Users, { count: picker.loaded?.total })}
      {departments.length > 0 && <Text style={styles.sideTitle}>{t('messenger:picker.department')}</Text>}
      {departments.map((item) => nav(item.key, item.name, null, { color: item.color, count: item.count, badge: item.badge, level: item.level }))}
      {projects.length > 0 && <Text style={styles.sideTitle}>{t('messenger:picker.project')}</Text>}
      {projects.map((item) => nav(item.key, item.name, Layers, { count: item.count, badge: item.badge }))}
    </ScrollView>
  );
}

/** 右栏已选：标题行（数量、清空）、进度条、已选列表（新选的在上，悬停出移除）；没选时是提示 */
function SelectedPanel({ picker, max, chipFocus }: { picker: Picker; max: number; chipFocus: boolean }) {
  const t = useT();
  const { selected } = picker;
  const list = selected.slice().reverse();
  return (
    <View style={styles.right}>
      <View style={styles.rh}>
        <Text style={styles.rhTitle}>{t('messenger:picker.selected')}</Text>
        <Text style={styles.rhCount}>{`${selected.length} / ${max}`}</Text>
        {selected.length > 0 && (
          <Touchable accessibilityRole="button" onPress={picker.clear} style={styles.clearLink}>
            {({ hovered }) => <Text style={styles.clearText(hovered)}>{t('messenger:picker.clear')}</Text>}
          </Touchable>
        )}
      </View>
      <View style={styles.meter}>
        <View style={styles.meterBar(Math.min(100, (selected.length / max) * 100), selected.length >= max)} />
      </View>
      {list.length > 0 ? (
        <ScrollView style={styles.rl} contentContainerStyle={styles.rlContent} showsVerticalScrollIndicator={false}>
          {list.map((item, index) => (
            <SelectedRow key={pickKey(item)} item={item} focus={chipFocus && index === 0} narrow={false} onRemove={picker.remove} />
          ))}
        </ScrollView>
      ) : (
        <View style={styles.rempty}>
          <View style={styles.remptyStack}>
            {[0, 1, 2].map((index) => (
              <View key={index} style={styles.remptyDot} />
            ))}
          </View>
          <Text style={styles.remptyText}>{t('messenger:picker.selectedHint')}</Text>
        </View>
      )}
    </View>
  );
}

function KeyHint({ keys, label }: { keys: string[]; label: string }) {
  return (
    <View style={styles.key}>
      {keys.map((key) => (
        <Text key={key} style={styles.kbd}>{key}</Text>
      ))}
      <Text style={styles.footText}>{label}</Text>
    </View>
  );
}

/* ───────────────────────── 窄屏 ───────────────────────── */

function NarrowPicker({ picker, max, showSelected, setShowSelected, onClose, onSubmit }: {
  picker: Picker;
  max: number;
  showSelected: boolean;
  setShowSelected: (show: boolean) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const t = useT();
  const { theme } = useUnistyles();
  const { selected, page, pages, depth, word, view } = picker;
  const listRef = useRef<FlashListRef<PickerRow>>(null);
  const has = selected.length > 0;
  const list = selected.slice().reverse();
  const stack = list.slice(0, 4);
  const letters = view.letters && !word ? view.rows.flatMap((row, index) => (row.type === 'header' ? [{ title: row.title, index }] : [])) : [];

  const renderItem = useCallback(
    ({ item }: { item: PickerRow }) => {
      if (item.type === 'header') return <GroupHeader title={item.title} narrow />;
      if (item.type === 'source') return <SourceRow item={item} word={word} kb={false} narrow indexed={false} onOpen={picker.openSource} />;
      return <PickRow item={item.item} word={word} on={picker.selectedKeys.has(pickKey(item.item))} kb={false} narrow indexed={letters.length > 0} onToggle={picker.toggle} />;
    },
    [word, picker.selectedKeys, picker.openSource, picker.toggle, letters.length],
  );

  return (
    <View style={styles.root}>
      <View style={styles.bar}>
        {depth > 1 ? (
          <Touchable accessibilityRole="button" onPress={picker.pop} style={({ pressed }) => styles.barButton(true, pressed)}>
            <Icon icon={ChevronLeft} color={theme.colors.uspText} size={theme.size.uspNarrow.barButtonIcon} />
            <Text style={styles.barButtonText(true)} numberOfLines={1}>{picker.titleOf(pages.stack[depth - 2]!)}</Text>
          </Touchable>
        ) : (
          <Touchable accessibilityRole="button" onPress={onClose} style={({ pressed }) => styles.barButton(false, pressed)}>
            <Text style={styles.barButtonText(false)}>{t('cancel')}</Text>
          </Touchable>
        )}
        <Text style={styles.barTitle} numberOfLines={1} accessibilityRole="header">{picker.titleOf(page)}</Text>
      </View>
      <SearchBox picker={picker} narrow />

      <View style={styles.main}>
        <View style={styles.center}>
          <PickerList
            picker={picker}
            listRef={listRef}
            renderItem={renderItem}
            extraData={renderItem}
            narrow
            header={page === 'home' && !word ? <Entries picker={picker} /> : undefined}
          />
          {letters.length > 1 && (
            <View style={styles.index} pointerEvents="box-none">
              {letters.map((letter) => (
                <Touchable key={letter.title} accessibilityRole="button" onPress={() => listRef.current?.scrollToIndex({ index: letter.index, animated: false })}>
                  <Text style={styles.indexLetter} allowFontScaling={false}>{letter.title}</Text>
                </Touchable>
              ))}
            </View>
          )}
        </View>
      </View>

      <View style={styles.footNarrow}>
        <Touchable accessibilityRole="button" disabled={!has} onPress={() => setShowSelected(!showSelected)} style={({ pressed }) => styles.stack(pressed && has)}>
          {has ? (
            <>
              <View style={styles.stackAvatars}>
                {stack.map((item) => (
                  <View key={pickKey(item)} style={styles.stackAvatar}>
                    <PickAvatar item={item} size={theme.size.avatar.pickChip} />
                  </View>
                ))}
                {selected.length > stack.length && (
                  <View style={[styles.stackAvatar, styles.stackMore]}>
                    <Text style={styles.stackMoreText} allowFontScaling={false}>{`+${selected.length - stack.length}`}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.stackText} numberOfLines={1}>
                {`${t('messenger:picker.selected')} `}
                <Text style={styles.stackCount}>{`${selected.length} / ${max}`}</Text>
              </Text>
              <View style={styles.stackChev(showSelected)}>
                <Icon icon={ChevronUp} color={theme.colors.uspText3} size={theme.size.uspNarrow.stackChev} />
              </View>
            </>
          ) : (
            <Text style={styles.stackNone} numberOfLines={1}>{t('messenger:picker.maxItems', { n: max })}</Text>
          )}
        </Touchable>
        <Touchable accessibilityRole="button" disabled={!has} onPress={onSubmit} style={({ pressed }) => styles.submit(has, pressed)}>
          <Text style={styles.submitText(has)}>{t('confirm')}</Text>
        </Touchable>
      </View>

      {showSelected && has && (
        <>
          <Touchable accessibilityRole="button" accessibilityLabel={t('close')} onPress={() => setShowSelected(false)} style={styles.selMask} />
          <View style={styles.selPop}>
            <View style={styles.selHead}>
              <Text style={styles.selTitle}>{t('messenger:picker.selected')}</Text>
              <Text style={styles.selCount}>{`${selected.length} / ${max}`}</Text>
              <Touchable
                accessibilityRole="button"
                onPress={() => {
                  picker.clear();
                  setShowSelected(false);
                }}
                style={styles.clearLink}
              >
                <Text style={styles.selClear}>{t('messenger:picker.clear')}</Text>
              </Touchable>
            </View>
            <ScrollView>
              {list.map((item) => (
                <SelectedRow
                  key={pickKey(item)}
                  item={item}
                  focus={false}
                  narrow
                  onRemove={(itemKey) => {
                    picker.remove(itemKey);
                    if (selected.length === 1) setShowSelected(false);
                  }}
                />
              ))}
            </ScrollView>
          </View>
        </>
      )}
    </View>
  );
}

/** 手机首页入口：全部成员、按部门、按项目 */
function Entries({ picker }: { picker: Picker }) {
  const { theme } = useUnistyles();
  return (
    <View style={styles.entries}>
      {picker.entries.map((entry) => (
        <Touchable key={entry.key} accessibilityRole="button" onPress={() => picker.push(entry.key as PageKey)} style={({ pressed }) => styles.entry(pressed)}>
          <View style={[styles.entryIcon, { backgroundColor: entry.color }]}>
            <Icon icon={entry.icon} color={theme.colors.onPrimary} size={theme.size.uspNarrow.entryGlyph} />
          </View>
          <Text style={styles.entryLabel} numberOfLines={1}>{entry.name}</Text>
          {entry.badge > 0 ? <CountBadge count={entry.badge} narrow /> : entry.count !== undefined && <Text style={styles.entryCount}>{entry.count}</Text>}
          <Icon icon={ChevronRight} color={theme.colors.uspText4} size={theme.size.usp.chev} />
        </Touchable>
      ))}
    </View>
  );
}

/* ───────────────────────── 两种宽度共用 ───────────────────────── */

/** 搜索框：宽屏平时透明、聚焦变灰，手机常灰；搜索中图标换成转圈，有字时出清除 */
function SearchBox({ picker, inputRef, narrow }: { picker: Picker; inputRef?: RefObject<TextInputInstance | null>; narrow: boolean }) {
  const t = useT();
  const { theme } = useUnistyles();
  const [focused, setFocused] = useState(false);
  const ownRef = useRef<TextInputInstance>(null);
  const ref = inputRef ?? ownRef;
  const searching = !!picker.word && picker.view.loading;
  return (
    <View style={styles.search(narrow, focused)}>
      <Touchable accessible={false} onPress={() => ref.current?.focus()} style={styles.searchIcon}>
        {searching ? (
          <ActivityIndicator size={theme.size.usp.searchIcon - 2} color={theme.colors.uspText3} />
        ) : (
          <Icon icon={Search} color={theme.colors.uspText3} size={theme.size.usp.searchIcon} />
        )}
      </Touchable>
      <TextInput
        ref={ref}
        value={picker.key}
        onChangeText={picker.setKey}
        placeholder={t('messenger:picker.searchDialogs')}
        placeholderTextColor={theme.colors.uspText4}
        autoCorrect={false}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={styles.searchInput(narrow)}
      />
      {!!picker.key && (
        <Touchable
          accessibilityRole="button"
          accessibilityLabel={t('clear')}
          onPress={() => {
            picker.setKey('');
            ref.current?.focus();
          }}
          style={styles.searchClear}
        >
          <Icon icon={X} color={theme.colors.onPrimary} size={theme.size.usp.clearIcon} strokeWidth={3} />
        </Touchable>
      )}
    </View>
  );
}

/** 中间列表：分组标题吸顶，到底取下一页成员，加载中、空状态在末尾 */
function PickerList({ picker, listRef, renderItem, extraData, narrow, header }: {
  picker: Picker;
  listRef: RefObject<FlashListRef<PickerRow> | null>;
  renderItem: ({ item }: { item: PickerRow }) => ReactElement;
  extraData: unknown;
  narrow: boolean;
  header?: ReactElement;
}) {
  const t = useT();
  const { theme } = useUnistyles();
  const { view, word, page } = picker;
  const emptyText = { '': '', none: t('messenger:picker.noResult'), failed: t('loadFailed'), notFound: t('messenger:picker.notFound', { key: word }) }[view.empty];
  return (
    <FlashList
      key={word ? 'search' : `${picker.depth}-${page}`}
      ref={listRef}
      data={view.rows}
      keyExtractor={rowKey}
      getItemType={rowType}
      renderItem={renderItem}
      extraData={extraData}
      stickyHeaderIndices={view.sticky}
      keyboardShouldPersistTaps="handled"
      onEndReached={() => !word && isMemberKey(page) && picker.nextMembers(page)}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={header}
      ListFooterComponent={
        view.loading && view.rows.length === 0 ? (
          <View style={styles.loading}>
            <ActivityIndicator size={theme.size.usp.loading} color={theme.colors.uspText3} />
          </View>
        ) : emptyText ? (
          <View style={styles.empty(narrow)}>
            <Icon icon={Search} color={theme.colors.uspText3} size={theme.size.usp.emptyIcon} />
            <Text style={styles.emptyText(narrow)}>{emptyText}</Text>
          </View>
        ) : undefined
      }
      contentContainerStyle={styles.listContent(narrow)}
    />
  );
}

const GroupHeader = memo(function GroupHeader({ title, narrow }: { title: string; narrow: boolean }) {
  return (
    <View style={styles.grp(narrow)}>
      <Text style={styles.grpText(narrow)}>{title}</Text>
    </View>
  );
});

/** 名字里的关键词：主色加粗 */
function Highlight({ text, word, narrow }: { text: string; word: string; narrow: boolean }) {
  const index = word ? text.toLowerCase().indexOf(word.toLowerCase()) : -1;
  if (index < 0) return text;
  return (
    <>
      {text.slice(0, index)}
      <Text style={styles.mark(narrow)}>{text.slice(index, index + word.length)}</Text>
      {text.slice(index + word.length)}
    </>
  );
}

/** 一个人或群：选中铺浅主色，右边是圆形勾选 */
const PickRow = memo(function PickRow({ item, word, on, kb, narrow, indexed = false, onToggle }: {
  item: Picked;
  word: string;
  on: boolean;
  kb: boolean;
  narrow: boolean;
  indexed?: boolean;
  onToggle: (item: Picked) => void;
}) {
  const t = useT();
  const { theme } = useUnistyles();
  const sub = isGroup(item) ? t('messenger:picker.people', { n: item.people }) : item.sub;
  return (
    <Touchable accessibilityRole="checkbox" aria-checked={on} onPress={() => onToggle(item)} style={({ hovered, pressed }) => styles.row(narrow, on, kb || hovered, pressed, 0, indexed)}>
      {({ hovered }) => (
        <>
          <PickAvatar item={item} size={narrow ? theme.size.avatar.lg : theme.size.avatar.pick} />
          <View style={styles.info}>
            <Text style={styles.name(narrow)} numberOfLines={1}>
              <Highlight text={pickName(item)} word={word} narrow={narrow} />
            </Text>
            {!!sub && <Text style={styles.desc(narrow)} numberOfLines={1}>{sub}</Text>}
          </View>
          <View style={styles.tick(narrow, on, hovered && !narrow)}>
            {on && <Icon icon={Check} color={theme.colors.onPrimary} size={narrow ? theme.size.uspNarrow.tickIcon : theme.size.usp.tickIcon} strokeWidth={3.4} />}
          </View>
        </>
      )}
    </Touchable>
  );
});

/** 部门或项目：色块、名字和人数、已选数，点了进入 */
const SourceRow = memo(function SourceRow({ item, word, kb, narrow, indexed = false, onOpen }: {
  item: SourceItem;
  word: string;
  kb: boolean;
  narrow: boolean;
  indexed?: boolean;
  onOpen: (key: string) => void;
}) {
  const t = useT();
  const { theme } = useUnistyles();
  return (
    <Touchable accessibilityRole="button" onPress={() => onOpen(item.key)} style={({ hovered, pressed }) => styles.row(narrow, false, kb || hovered, pressed, item.level, indexed)}>
      <View style={[styles.sq(narrow), { backgroundColor: item.color }]}>
        <Icon icon={item.project ? Layers : Building2} color={theme.colors.onPrimary} size={narrow ? theme.size.uspNarrow.sqIcon : theme.size.usp.sqIcon} />
      </View>
      <View style={styles.info}>
        <Text style={styles.name(narrow)} numberOfLines={1}>
          <Highlight text={item.name} word={word} narrow={narrow} />
        </Text>
        <Text style={styles.desc(narrow)} numberOfLines={1}>{t('messenger:picker.people', { n: item.count })}</Text>
      </View>
      {item.badge > 0 && <CountBadge count={item.badge} narrow={narrow} />}
      <Icon icon={ChevronRight} color={theme.colors.uspText4} size={theme.size.usp.chev} />
    </Touchable>
  );
});

/** 已选的一行：头像、名字、移除（宽屏悬停才出） */
function SelectedRow({ item, focus, narrow, onRemove }: { item: Picked; focus: boolean; narrow: boolean; onRemove: (key: string) => void }) {
  const t = useT();
  const { theme } = useUnistyles();
  const [hovered, setHovered] = useState(false);
  return (
    <View style={styles.pr(narrow, hovered, focus)} onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)}>
      <PickAvatar item={item} size={narrow ? theme.size.avatar.pickSel : theme.size.avatar.pickChip} />
      <Text style={styles.prName(narrow)} numberOfLines={1}>{pickName(item)}</Text>
      <Touchable
        accessibilityRole="button"
        accessibilityLabel={t('messenger:picker.remove')}
        onPress={() => onRemove(pickKey(item))}
        style={({ hovered: on }) => styles.rm(narrow, narrow || hovered || focus, on)}
      >
        {({ hovered: on }) => <Icon icon={X} color={on ? theme.colors.uspText : theme.colors.uspText3} size={narrow ? theme.size.uspNarrow.rmIcon : theme.size.usp.rmIcon} />}
      </Touchable>
    </View>
  );
}

function CountBadge({ count, narrow }: { count: number; narrow: boolean }) {
  return (
    <View style={styles.badge(narrow)}>
      <Text style={styles.badgeText(narrow)}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => {
  const u = theme.size.usp;
  const n = theme.size.uspNarrow;
  const c = theme.colors;
  return {
    root: { flex: 1, minWidth: 0, backgroundColor: c.surface },
    top: { flexDirection: 'row', alignItems: 'center', gap: u.topGap, height: u.top, paddingLeft: u.topPadL, paddingRight: u.topPadR },
    title: { ...theme.typography.uspTitle, maxWidth: '30%', color: c.uspText },
    search: (narrow: boolean, focused: boolean) => ({
      flex: narrow ? undefined : 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: narrow ? n.searchGap : u.searchGap,
      height: narrow ? n.search : u.search,
      marginTop: narrow ? n.searchTop : 0,
      marginHorizontal: narrow ? n.searchX : 0,
      marginBottom: narrow ? n.searchBottom : 0,
      paddingHorizontal: narrow ? n.searchPadX : u.searchPadX,
      borderRadius: u.searchRadius,
      backgroundColor: focused ? c.uspSearchFocus : narrow ? c.uspFill : 'transparent',
    }),
    searchIcon: { width: u.searchIcon, alignItems: 'center' },
    searchInput: (narrow: boolean) => ({
      ...(narrow ? theme.typography.uspSearchNarrow : theme.typography.uspSearch),
      flex: 1,
      minWidth: 0,
      padding: 0,
      color: c.uspText,
      outlineStyle: 'solid',
      outlineWidth: 0,
    }),
    searchClear: { width: u.clear, height: u.clear, borderRadius: u.clear / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: c.uspText4 },
    close: (hovered: boolean) => ({
      width: u.close,
      height: u.close,
      borderRadius: u.closeRadius,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: hovered ? c.uspHover : 'transparent',
    }),
    main: { flex: 1, minHeight: 0, flexDirection: 'row', gap: u.mainGap, paddingHorizontal: u.mainPadX },
    side: (dim: boolean) => ({ flexGrow: 0, width: u.side, borderRadius: u.panelRadius, backgroundColor: c.uspPanel, opacity: dim ? theme.opacity.disabled - 0.05 : 1 }),
    sideContent: { padding: u.sidePad },
    sideTitle: { ...theme.typography.uspSideTitle, letterSpacing: 0.3, paddingTop: u.sideTitleTop, paddingHorizontal: u.sideTitleX, paddingBottom: u.sideTitleBottom, color: c.uspText3 },
    nav: (on: boolean, hovered: boolean, level: number) => ({
      flexDirection: 'row',
      alignItems: 'center',
      gap: u.navGap,
      height: u.nav,
      paddingLeft: u.navPadX + level * u.navIndent,
      paddingRight: u.navPadX,
      borderRadius: u.navRadius,
      backgroundColor: on ? c.surface : hovered ? c.uspHover : 'transparent',
      boxShadow: on ? theme.shadow.uspNav : undefined,
    }),
    navIcon: { width: u.navIconBox, alignItems: 'center' },
    navDot: { width: u.dot, height: u.dot, marginHorizontal: u.dotMargin, borderRadius: u.dotRadius },
    navLabel: (on: boolean, hovered: boolean) => ({ ...(on ? theme.typography.uspNavOn : theme.typography.uspNav), flex: 1, color: on || hovered ? c.uspText : c.uspText2 }),
    navCount: { ...theme.typography.uspCount, fontVariant: ['tabular-nums'], color: c.uspText4 },
    badge: (narrow: boolean) => ({ paddingHorizontal: narrow ? n.badgePadX : u.badgePadX, borderRadius: theme.radius.pill, backgroundColor: c.uspPrimarySoft }),
    badgeText: (narrow: boolean) => ({ ...(narrow ? theme.typography.uspBadgeNarrow : theme.typography.uspBadge), fontVariant: ['tabular-nums'], color: c.uspPrimaryText }),
    center: { flex: 1, minWidth: 0 },
    ch: { flexDirection: 'row', alignItems: 'center', gap: u.chGap, height: u.ch, paddingLeft: u.chPadL, paddingRight: u.chPadR },
    chTitle: { ...theme.typography.uspChTitle, flexShrink: 1, color: c.uspText },
    chSub: { ...theme.typography.uspChSub, color: c.uspText3 },
    listContent: (narrow: boolean) => ({ paddingBottom: narrow ? n.listBottom : u.listBottom }),
    grp: (narrow: boolean) => ({
      paddingTop: narrow ? n.grpTop : u.grpTop,
      paddingHorizontal: narrow ? n.grpX : u.grpX,
      paddingBottom: narrow ? n.grpBottom : u.grpBottom,
      backgroundColor: c.surface,
    }),
    grpText: (narrow: boolean) => ({ ...(narrow ? theme.typography.uspGrpNarrow : theme.typography.uspGrp), letterSpacing: 0.3, color: c.uspText3 }),
    row: (narrow: boolean, on: boolean, hovered: boolean, pressed: boolean, level: number, indexed: boolean) => ({
      flexDirection: 'row',
      alignItems: 'center',
      gap: u.rowGap,
      minHeight: narrow ? n.row : u.row,
      height: narrow ? undefined : u.row,
      paddingLeft: (narrow ? n.rowPadX : u.rowPadX) + level * u.rowIndent,
      paddingRight: indexed ? n.indexPad : narrow ? n.rowPadX : u.rowPadX,
      borderRadius: narrow ? 0 : u.rowRadius,
      backgroundColor: on
        ? narrow || !hovered
          ? c.uspPrimarySoft
          : c.uspPrimarySoftHover
        : pressed
          ? narrow
            ? c.uspHover
            : c.uspPressed
          : hovered && !narrow
            ? c.uspHover
            : 'transparent',
    }),
    info: { flex: 1, minWidth: 0 },
    name: (narrow: boolean) => ({ ...(narrow ? theme.typography.uspNameNarrow : theme.typography.uspName), color: c.uspText }),
    mark: (narrow: boolean) => ({ fontWeight: narrow ? '600' : '700', color: c.uspPrimaryText }),
    desc: (narrow: boolean) => ({ ...(narrow ? theme.typography.uspDescNarrow : theme.typography.uspDesc), marginTop: u.descTop, color: c.uspText3 }),
    sq: (narrow: boolean) => ({
      width: narrow ? n.sq : u.sq,
      height: narrow ? n.sq : u.sq,
      borderRadius: narrow ? n.sqRadius : u.sqRadius,
      alignItems: 'center',
      justifyContent: 'center',
    }),
    tick: (narrow: boolean, on: boolean, hovered: boolean) => ({
      width: narrow ? n.tick : u.tick,
      height: narrow ? n.tick : u.tick,
      borderRadius: theme.radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: on ? c.primary : 'transparent',
      boxShadow: on ? undefined : `inset 0px 0px 0px ${u.tickRing}px ${hovered ? c.primary : c.uspText4}`,
    }),
    loading: { alignItems: 'center', paddingVertical: u.loading },
    empty: (narrow: boolean) => ({ alignItems: 'center', gap: u.emptyGap, paddingTop: narrow ? n.empty : u.empty }),
    emptyText: (narrow: boolean) => ({ ...(narrow ? theme.typography.uspEmptyNarrow : theme.typography.uspEmpty), color: c.uspText3 }),
    right: { width: u.side, paddingHorizontal: u.rPadX, borderRadius: u.panelRadius, backgroundColor: c.uspPanel },
    rh: { flexDirection: 'row', alignItems: 'baseline', gap: u.rhGap, height: u.rh, paddingTop: u.rhTop, paddingHorizontal: u.rhX },
    rhTitle: { ...theme.typography.uspRh, letterSpacing: 0.3, color: c.uspText3 },
    rhCount: { ...theme.typography.uspRhCount, fontVariant: ['tabular-nums'], color: c.uspText3 },
    clearLink: { marginLeft: 'auto' },
    clearText: (hovered: boolean) => ({ ...theme.typography.uspRhCount, color: hovered ? c.uspText : c.uspText3 }),
    meter: { height: u.meter, marginHorizontal: u.meterX, marginBottom: u.meterBottom, borderRadius: u.meterRadius, backgroundColor: c.uspFill },
    meterBar: (percent: number, full: boolean) => ({ width: `${percent}%`, height: '100%', borderRadius: u.meterRadius, backgroundColor: full ? c.uspMeterFull : c.primary }),
    rl: { flex: 1 },
    rlContent: { paddingBottom: u.rlBottom },
    pr: (narrow: boolean, hovered: boolean, focus: boolean) => ({
      flexDirection: 'row',
      alignItems: 'center',
      gap: narrow ? n.prGap : u.prGap,
      height: narrow ? n.pr : u.pr,
      paddingLeft: narrow ? n.prPadL : u.prPadL,
      paddingRight: narrow ? n.prPadR : u.prPadR,
      borderRadius: narrow ? 0 : u.prRadius,
      backgroundColor: focus ? c.uspHover : hovered && !narrow ? c.surface : 'transparent',
      boxShadow: focus ? `inset 0px 0px 0px ${u.tickRing}px ${c.primary}` : undefined,
    }),
    prName: (narrow: boolean) => ({ ...(narrow ? theme.typography.uspPrNameNarrow : theme.typography.uspPrName), flex: 1, color: c.uspText }),
    rm: (narrow: boolean, visible: boolean, hovered: boolean) => ({
      width: narrow ? n.rm : u.rm,
      height: narrow ? n.rm : u.rm,
      borderRadius: narrow ? n.rm / 2 : u.rmRadius,
      alignItems: 'center',
      justifyContent: 'center',
      opacity: visible ? 1 : 0,
      backgroundColor: hovered ? c.uspPressed : 'transparent',
    }),
    rempty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: u.remptyGap, paddingHorizontal: u.remptyX, paddingBottom: u.remptyBottom },
    remptyStack: { flexDirection: 'row', paddingLeft: u.remptyOverlap },
    remptyDot: {
      width: u.remptyDot,
      height: u.remptyDot,
      marginLeft: -u.remptyOverlap,
      borderRadius: theme.radius.pill,
      borderWidth: u.remptyRing,
      borderColor: c.uspPanel,
      backgroundColor: c.uspFill,
    },
    remptyText: { ...theme.typography.uspRempty, textAlign: 'center', color: c.uspText4 },
    foot: { flexDirection: 'row', alignItems: 'center', gap: u.footGap, height: u.foot, paddingLeft: u.footPadL, paddingRight: u.footPadR },
    key: { flexDirection: 'row', alignItems: 'center', gap: u.keyGap },
    footText: { ...theme.typography.uspFoot, color: c.uspText3 },
    kbd: { ...theme.typography.uspFoot, paddingVertical: u.kbdPadY, paddingHorizontal: u.kbdPadX, borderRadius: u.kbdRadius, overflow: 'hidden', color: c.uspText3, backgroundColor: c.uspFill },
    kbdOnPrimary: { marginLeft: u.kbdGap, color: c.onPrimary, backgroundColor: c.uspKbdOnPrimary },
    acts: { flexDirection: 'row', gap: u.actsGap, marginLeft: 'auto' },
    bar: { flexDirection: 'row', alignItems: 'center', height: n.bar, paddingHorizontal: n.barPadX },
    barButton: (back: boolean, pressed: boolean) => ({
      zIndex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: n.barButtonGap,
      maxWidth: '40%',
      height: n.barButton,
      paddingLeft: back ? 0 : n.barButtonPadX,
      paddingRight: n.barButtonPadX,
      borderRadius: n.barButton / 2,
      backgroundColor: pressed ? c.uspHover : 'transparent',
    }),
    barButtonText: (back: boolean) => ({ ...theme.typography.uspBarButton, flexShrink: 1, color: back ? c.uspText : c.uspText2 }),
    barTitle: { ...theme.typography.uspBarTitle, position: 'absolute', left: n.barTitleX, right: n.barTitleX, textAlign: 'center', color: c.uspText, pointerEvents: 'none' },
    entries: { marginTop: n.entriesTop, marginHorizontal: n.entriesX, marginBottom: n.entriesBottom, padding: n.entriesPad, borderRadius: u.panelRadius, backgroundColor: c.uspPanel },
    entry: (pressed: boolean) => ({
      flexDirection: 'row',
      alignItems: 'center',
      gap: n.entryGap,
      height: n.entry,
      paddingLeft: n.entryPadL,
      paddingRight: n.entryPadR,
      borderRadius: n.entryRadius,
      backgroundColor: pressed ? c.surface : 'transparent',
    }),
    entryIcon: { width: n.entryIcon, height: n.entryIcon, borderRadius: n.entryIconRadius, alignItems: 'center', justifyContent: 'center' },
    entryLabel: { ...theme.typography.uspEntry, flex: 1, color: c.uspText },
    entryCount: { ...theme.typography.uspEntryCount, color: c.uspText3 },
    index: { position: 'absolute', right: n.indexRight, top: 0, bottom: 0, justifyContent: 'center', zIndex: 4 },
    indexLetter: { ...theme.typography.uspIndex, width: n.indexWidth, textAlign: 'center', color: c.uspText3 },
    footNarrow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: n.footGap,
      paddingVertical: n.footY,
      paddingHorizontal: n.footX,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.uspLine,
    },
    stack: (pressed: boolean) => ({
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: n.stackGap,
      height: n.stack,
      paddingLeft: n.stackPadL,
      paddingRight: n.stackPadR,
      borderRadius: n.stackRadius,
      backgroundColor: pressed ? c.uspHover : 'transparent',
    }),
    stackAvatars: { flexDirection: 'row', paddingLeft: n.stackOverlap },
    stackAvatar: { marginLeft: -n.stackOverlap, borderRadius: theme.radius.pill, boxShadow: `0px 0px 0px ${n.stackRing}px ${c.surface}` },
    stackMore: { width: n.stackAvatar, height: n.stackAvatar, alignItems: 'center', justifyContent: 'center', backgroundColor: c.uspFill },
    stackMoreText: { ...theme.typography.uspStackMore, color: c.uspText2 },
    stackText: { ...theme.typography.uspStack, flexShrink: 1, color: c.uspText2 },
    stackCount: { fontWeight: '700', fontVariant: ['tabular-nums'], color: c.uspText },
    stackChev: (open: boolean) => ({ transform: [{ rotate: open ? '180deg' : '0deg' }] }),
    stackNone: { ...theme.typography.uspStack, color: c.uspText4 },
    submit: (on: boolean, pressed: boolean) => ({
      height: n.submit,
      minWidth: n.submitMin,
      paddingHorizontal: n.submitPadX,
      borderRadius: n.submitRadius,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: on ? c.primary : c.uspFill,
      opacity: on && pressed ? theme.opacity.pressedPrimary : 1,
    }),
    submitText: (on: boolean) => ({ ...theme.typography.uspSubmit, color: on ? c.onPrimary : c.uspText4 }),
    selMask: { ...StyleSheet.absoluteFillObject, zIndex: 10, backgroundColor: c.uspMask },
    selPop: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 11,
      maxHeight: `${n.selMax * 100}%`,
      paddingTop: n.selTop,
      paddingBottom: n.selBottom,
      borderTopLeftRadius: n.selRadius,
      borderTopRightRadius: n.selRadius,
      backgroundColor: c.surface,
      boxShadow: theme.shadow.uspPop,
    },
    selHead: { flexDirection: 'row', alignItems: 'center', gap: u.rhGap, paddingTop: n.selHeadTop, paddingHorizontal: n.selHeadX, paddingBottom: n.selHeadBottom },
    selTitle: { ...theme.typography.uspSelTitle, color: c.uspText },
    selCount: { ...theme.typography.uspSelCount, fontVariant: ['tabular-nums'], color: c.uspText3 },
    selClear: { ...theme.typography.uspSelClear, color: c.uspText2 },
  };
});
