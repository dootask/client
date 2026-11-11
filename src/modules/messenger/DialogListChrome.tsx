import { router } from 'expo-router';
import { MessagesSquare, Menu as MenuIcon, Search, User, X } from 'lucide-react-native';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, type LayoutRectangle, ScrollView, type ScrollViewInstance, Text, TextInput, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../i18n';
import { categoryUnread, dialogNum, type StoredDialog } from '../../sync/messenger';
import { Badge } from '../../ui/Badge';
import { Icon } from '../../ui/Icon';
import { Menu } from '../../ui/popover';
import { thinLine } from '../../ui/thinLine';
import { Touchable } from '../../ui/Touchable';
import { useMessengerState } from './hooks';
import { CATEGORIES, type ListCategory } from './listModel';
import { selectCategory, shakeUnread, useDialogListState } from './listState';

const CATEGORY_LABELS = {
  '': 'messenger:category.all',
  project: 'messenger:category.project',
  task: 'messenger:category.task',
  user: 'messenger:category.user',
  group: 'messenger:category.group',
  bot: 'messenger:category.bot',
  mark: 'messenger:category.mark',
  mention: 'messenger:category.mention',
} as const satisfies Record<ListCategory, string>;

/** 点分类（下拉、页签、底部「消息」）：换分类；点的就是当前分类时晃动第一个未读（同旧版 onActive） */
function activate(category: ListCategory) {
  if (useDialogListState.getState().category === category) shakeUnread();
  else selectCategory(category);
}

/** 各分类的未读数（同旧版 msgUnread）：全部算所有会话，标注、@我 不显示 */
function categoryCount(list: readonly StoredDialog[], category: ListCategory): number {
  if (category === 'mark' || category === 'mention') return 0;
  if (category === '') return list.reduce((n, d) => n + dialogNum(d), 0);
  return categoryUnread(list, category);
}

function useCategoryCounts(): Record<ListCategory, number> {
  const dialogs = useMessengerState((s) => s.dialogs);
  return useMemo(() => {
    const list = Object.values(dialogs);
    return Object.fromEntries(CATEGORIES.map((c) => [c, categoryCount(list, c)])) as Record<ListCategory, number>;
  }, [dialogs]);
}

/**
 * 搜索框（同旧版 messenger-search）：左边放大镜，加载、搜索中换成转圈；有字时右边出清除按钮
 * （宽屏同旧版悬停才出，窄屏没有悬停一直出）。宽屏灰底圆角 12，窄屏白底圆角 10、上下留白、头部底色
 */
export function DialogSearch({ narrow, loading }: { narrow: boolean; loading: boolean }) {
  const t = useT();
  const { theme } = useUnistyles();
  const key = useDialogListState((s) => s.key);
  const ready = useMessengerState((s) => s.ready);
  const [hovered, setHovered] = useState(false);
  const iconColor = narrow ? theme.colors.headerSearchIcon : theme.colors.searchIcon;
  return (
    <View style={styles.searchRow(narrow)}>
      <View testID="dialog-search" style={styles.searchBox(narrow)} onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)}>
        <View style={styles.searchPre(narrow)}>
          {loading || !ready ? (
            <ActivityIndicator size="small" color={iconColor} />
          ) : (
            <Icon icon={Search} size={theme.size.dialogChrome.icon} color={iconColor} />
          )}
        </View>
        <TextInput
          value={key}
          onChangeText={(v) => useDialogListState.setState({ key: v })}
          placeholder={ready ? t('messenger:search') : t('messenger:updating')}
          placeholderTextColor={theme.colors.placeholder}
          returnKeyType="search"
          autoCorrect={false}
          style={styles.searchInput}
        />
        {key !== '' && (narrow || hovered) && (
          <Touchable accessibilityRole="button" accessibilityLabel={t('clear')} onPress={() => useDialogListState.setState({ key: '' })} style={styles.searchClear}>
            <View style={styles.clearDot}>
              <Icon icon={X} size={theme.size.dialogChrome.clearX} color={theme.palette.onAvatar} strokeWidth={3} />
            </View>
          </Touchable>
        )}
      </View>
    </View>
  );
}

/**
 * 分类条（同旧版 messenger-nav）：左边 ☰ 下拉列出全部分类（固定顺序、带未读数），
 * 右边横排页签按上次选中的时间排；窄屏页签至少占四分之一宽，带头部底色和底部分隔线
 */
export const DialogNav = memo(function DialogNav({ narrow }: { narrow: boolean }) {
  const t = useT();
  const { theme } = useUnistyles();
  const category = useDialogListState((s) => s.category);
  const navOrder = useDialogListState((s) => s.navOrder);
  const counts = useCategoryCounts();
  const [width, setWidth] = useState(0);

  // 选中的页签滚进可见区域（同旧版 scrollToNav 的 nearest）
  const scrollRef = useRef<ScrollViewInstance>(null);
  const layouts = useRef(new Map<ListCategory, LayoutRectangle>());
  const scrollX = useRef(0);
  useEffect(() => {
    const item = layouts.current.get(category);
    if (!item || !width) return;
    const x = scrollX.current;
    if (item.x < x) scrollRef.current?.scrollTo({ x: item.x, animated: false });
    else if (item.x + item.width > x + width) scrollRef.current?.scrollTo({ x: item.x + item.width - width, animated: false });
  }, [category, width]);

  return (
    <View testID="dialog-nav" style={styles.nav(narrow)}>
      <Menu
        look="element"
        minWidth={narrow ? theme.size.dialogChrome.menuNarrow : theme.size.dialogChrome.menu}
        accessibilityLabel={t('messenger:categories')}
        items={() => CATEGORIES.map((c) => ({ label: t(CATEGORY_LABELS[c]), checked: c === category, badge: counts[c], onSelect: () => activate(c) }))}
        style={styles.navIcon(narrow)}
      >
        <Icon icon={MenuIcon} size={theme.size.dialogChrome.icon} color={theme.colors.tabText} />
      </Menu>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        onScroll={(e) => (scrollX.current = e.nativeEvent.contentOffset.x)}
        scrollEventThrottle={16}
        style={styles.navList}
        contentContainerStyle={styles.navListContent}
      >
        {navOrder.map((c) => {
          const count = counts[c];
          return (
            <Touchable
              key={c || 'all'}
              accessibilityRole="tab"
              aria-selected={c === category}
              onPress={() => activate(c)}
              onLayout={(e) => layouts.current.set(c, e.nativeEvent.layout)}
              style={styles.navItem(narrow ? width / 4 : 0)}
            >
              {({ hovered }) => (
                <View style={styles.navTitle}>
                  <Text style={styles.navText(c === category, hovered)} numberOfLines={1}>
                    {t(CATEGORY_LABELS[c])}
                  </Text>
                  {count > 0 && (
                    <View style={styles.navNum} pointerEvents="none">
                      <Badge count={count} scale={0.7} />
                    </View>
                  )}
                </View>
              )}
            </Touchable>
          );
        })}
      </ScrollView>
      {narrow && <View style={styles.navLine} />}
    </View>
  );
});

/** 宽屏列表栏底部（同旧版 messenger-menu）：消息（带总未读，再点晃动未读）、联系人 */
export function DialogBar() {
  const t = useT();
  const { theme } = useUnistyles();
  const counts = useCategoryCounts();
  return (
    <View testID="dialog-bar" style={styles.bar}>
      <View style={styles.barItem}>
        <Touchable accessibilityRole="button" accessibilityLabel={t('messenger:tabMessages')} onPress={() => activate(useDialogListState.getState().category)} style={styles.barIcon}>
          <Icon icon={MessagesSquare} size={theme.size.barIcon} color={theme.colors.primary} />
        </Touchable>
        {counts[''] > 0 && (
          <View style={styles.barNum} pointerEvents="none">
            <Badge count={counts['']} scale={0.8} origin="left" />
          </View>
        )}
      </View>
      <View style={styles.barItem}>
        <Touchable accessibilityRole="button" accessibilityLabel={t('messenger:tabContacts')} onPress={() => router.navigate('/contacts')} style={({ hovered }) => styles.barIconIdle(hovered)}>
          <Icon icon={User} size={theme.size.barIcon} color={theme.colors.barIcon} />
        </Touchable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  searchRow: (narrow: boolean) =>
    narrow
      ? {
          height: theme.size.dialogSearchRow,
          paddingTop: theme.spacing.md,
          paddingBottom: theme.size.dialogChrome.searchPadBottom,
          paddingHorizontal: theme.spacing.lg,
          backgroundColor: theme.colors.headerBg,
        }
      : {
          height: theme.size.dialogSearchRow,
          justifyContent: 'center',
          paddingHorizontal: theme.spacing.lg,
        },
  searchBox: (narrow: boolean) => ({
    height: narrow ? theme.size.dialogSearchNarrow : theme.size.dialogSearch,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: narrow ? theme.size.dialogChrome.searchInsetNarrow : theme.size.dialogChrome.searchInset,
    paddingRight: theme.size.dialogChrome.searchInset,
    borderRadius: narrow ? theme.radius.dialogSearchNarrow : theme.radius.dialogSearch,
    backgroundColor: narrow ? theme.colors.surface : theme.colors.searchFill,
  }),
  // 放大镜的格子压进输入框 6 像素，输入框文字左边距 7（同旧版）
  searchPre: (narrow: boolean) => ({
    width: narrow ? theme.size.dialogSearchPreNarrow : theme.size.dialogSearchPre,
    marginRight: -theme.size.dialogChrome.searchInset,
    alignItems: 'center',
    justifyContent: 'center',
  }),
  searchInput: {
    ...theme.typography.subhead,
    flex: 1,
    minWidth: 0,
    alignSelf: 'stretch',
    paddingLeft: theme.size.dialogChrome.inputPad,
    paddingRight: theme.size.dialogChrome.clear,
    color: theme.colors.regularText,
    outlineStyle: 'solid',
    outlineWidth: 0,
  },
  // 盖在输入框右端，出现、消失不挤动输入框
  searchClear: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: theme.size.dialogChrome.searchInset,
    width: theme.size.dialogChrome.clear,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 灰色实心圆配白叉（同旧版 iView 的 ios-close-circle）
  clearDot: {
    width: theme.size.dialogChrome.clearDot,
    height: theme.size.dialogChrome.clearDot,
    borderRadius: theme.size.dialogChrome.clearDot / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.searchIcon,
  },
  nav: (narrow: boolean) => ({
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: narrow ? theme.size.dialogChrome.navTopNarrow : 0,
    paddingBottom: theme.size.dialogChrome.navPad,
    paddingHorizontal: theme.size.dialogChrome.navPad,
    ...(narrow && { backgroundColor: theme.colors.headerBg }),
  }),
  navLine: {
    ...thinLine,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.headerLine,
  },
  navIcon: (narrow: boolean) => ({
    width: narrow ? theme.size.dialogNavIconNarrow : theme.size.dialogNavIcon,
    height: theme.size.dialogChrome.icon,
    alignItems: 'center',
    justifyContent: 'center',
  }),
  // 页签上的角标超出页签上沿，滚动区上移再用内边距补回，角标才不被裁掉（同旧版）
  navList: {
    flex: 1,
    marginTop: theme.size.navBadgeOffset.top,
  },
  navListContent: {
    flexGrow: 1,
    paddingTop: -theme.size.navBadgeOffset.top,
  },
  navItem: (minWidth: number) => ({
    flexGrow: 1,
    flexShrink: 0,
    minWidth,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.size.dialogChrome.navItemPadY,
    paddingHorizontal: theme.spacing.md,
  }),
  navTitle: {
    maxWidth: '100%',
  },
  navText: (active: boolean, hovered: boolean) => ({
    ...theme.typography.navItem,
    color: hovered ? theme.colors.tabTextHover : active ? theme.colors.tabTextActive : theme.colors.tabText,
    fontWeight: active ? '500' : '400',
  }),
  navNum: {
    position: 'absolute',
    top: theme.size.navBadgeOffset.top,
    right: theme.size.navBadgeOffset.right,
  },
  bar: {
    height: theme.size.dialogBar,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.paneLine,
  },
  barItem: {
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  barIcon: {
    marginHorizontal: theme.spacing.xxl,
  },
  barIconIdle: (hovered: boolean) => ({
    marginHorizontal: theme.spacing.xxl,
    opacity: hovered ? 1 : 0.9,
  }),
  barNum: {
    position: 'absolute',
    top: theme.size.barBadgeTop,
    left: '50%',
    marginLeft: theme.size.barBadgeShift,
  },
}));
