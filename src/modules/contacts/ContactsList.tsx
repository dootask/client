import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { useCallback, useMemo, useRef, useState } from 'react';
import { type NativeScrollEvent, type NativeSyntheticEvent, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../i18n';
import type { ContactRow } from '../../sync/contacts/model';
import { useSplitView } from '../../ui/layout';
import { LargeTitle } from '../../ui/LargeHeader';
import { LetterIndex } from '../../ui/LetterIndex';
import { showToast } from '../../ui/Toast';
import { Touchable } from '../../ui/Touchable';
import { bottomInset } from '../../ui/theme';
import { openDialogFrom } from '../messenger/chat/returnTab';
import { DialogBar } from '../messenger/DialogListChrome';
import { useMessenger } from '../messenger/hooks';
import { useErrorText, useSession } from '../session';
import { ContactLabel, ContactPerson } from './ContactRow';
import { ContactsSearch, ContactsToggle } from './ContactsChrome';
import { useContactsDialog } from './navigation';
import { contactsOwner } from './service';
import { useContacts } from './useContacts';

const keyOf = (row: ContactRow) => row.key;
const typeOf = (row: ContactRow) => row.kind;
const NO_ANCHOR = { disabled: true };
/** 视口外预先画的距离（默认 250）：快速甩动时首帧不出白块；行很轻，多画一屏的开销可以接受 */
const DRAW_DISTANCE = 1000;

export function ContactsList() {
  const owner = useSession(contactsOwner);
  return <ContactsContent key={owner} />;
}

function ContactsContent() {
  const t = useT();
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();
  const narrow = !useSplitView();
  const { rows, count, ready, keyword, setKeyword, mode, toggleMode, toggleDepartment } = useContacts();
  const listRef = useRef<FlashListRef<ContactRow>>(null);
  const messenger = useMessenger();
  const errorText = useErrorText();
  const [compact, setCompact] = useState(false);
  const compactRef = useRef(false);
  const opening = useRef(false);
  const onOpen = useCallback((userid: number) => {
    if (!messenger || opening.current) return;
    opening.current = true;
    const owner = contactsOwner(useSession.getState());
    messenger.openUser(userid).then((id) => {
      if (contactsOwner(useSession.getState()) !== owner) return;
      useContactsDialog.setState({ dialogId: id });
      openDialogFrom('contacts', id);
    }).catch((err) => {
      if (contactsOwner(useSession.getState()) === owner) showToast(errorText(err));
    }).finally(() => { opening.current = false; });
  }, [messenger, errorText]);
  const renderItem = useCallback(({ item }: { item: ContactRow }) => item.kind === 'label'
    ? <ContactLabel title={item.title} level={item.level} department={item.department} count={item.count} expanded={item.expanded} onToggle={toggleDepartment} />
    : <ContactPerson userid={item.userid} nickname={item.nickname} uri={item.uri} online={item.online} tags={item.tags} level={item.level} narrow={narrow} onOpen={onOpen} />,
  [toggleDepartment, narrow, onOpen]);
  const letters = useMemo(() => rows.flatMap((row) => row.kind === 'label' && row.department === undefined ? [row.title] : []), [rows]);
  const onLetter = useCallback((letter: string) => {
    const index = rows.findIndex((row) => row.key === `letter:${letter}`);
    if (index >= 0) void listRef.current?.scrollToIndex({ index, animated: false, viewOffset: theme.size.compactBar });
  }, [rows, theme.size.compactBar]);
  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!narrow) return;
    const next = event.nativeEvent.contentOffset.y >= theme.size.largeTitleRow;
    if (compactRef.current === next) return;
    compactRef.current = next;
    setCompact(next);
  }, [narrow, theme.size.largeTitleRow]);
  const toggle = useMemo(() => <ContactsToggle narrow={narrow} mode={mode} onPress={toggleMode} />, [narrow, mode, toggleMode]);
  const search = useMemo(() => <ContactsSearch narrow={narrow} keyword={keyword} onSearch={setKeyword} toggle={narrow ? undefined : toggle} />, [narrow, keyword, setKeyword, toggle]);
  const header = useMemo(() => narrow ? <View><LargeTitle title={t('shell:tab.contacts')} right={toggle} />{search}</View> : undefined, [narrow, t, toggle, search]);
  const footer = useMemo(() => ready && (!keyword || count > 0) ? <View testID="contacts-total" style={styles.footer(narrow)}><Text style={styles.footerText}>{keyword ? t('messenger:contacts.found', { n: count }) : t('messenger:contacts.total', { n: count })}</Text></View> : undefined, [ready, keyword, count, narrow, t]);
  const empty = useMemo(() => ready && keyword ? <View testID="contacts-empty" style={styles.empty}><Text style={styles.emptyText}>{t('messenger:contacts.noResult', { key: keyword })}</Text></View> : undefined, [ready, keyword, t]);

  return (
    <View testID="contacts-list" style={[styles.root(narrow), narrow && { paddingTop: insets.top }]}>
      {!narrow && search}
      <View style={styles.list}>
        <FlashList ref={listRef} data={rows} keyExtractor={keyOf} getItemType={typeOf} renderItem={renderItem} extraData={renderItem} ListHeaderComponent={header} ListFooterComponent={footer} ListEmptyComponent={empty} maintainVisibleContentPosition={NO_ANCHOR} drawDistance={DRAW_DISTANCE} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" onScroll={onScroll} scrollEventThrottle={16} />
        <LetterIndex letters={letters} onSelect={onLetter} />
      </View>
      {narrow && compact && <View style={[styles.compact, { top: insets.top }]}><Touchable style={styles.compactTitle} accessibilityRole="button" onPress={() => listRef.current?.scrollToOffset({ offset: 0, animated: false })}><Text style={styles.compactText}>{t('shell:tab.contacts')}</Text></Touchable>{toggle}</View>}
      {!narrow && <DialogBar contacts />}
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  root: (narrow: boolean) => ({ flex: 1, backgroundColor: narrow ? theme.colors.headerBg : theme.colors.surface }),
  list: {
    flex: 1,
    minHeight: 0,
    // 键盘弹起时底部让出被盖住的部分：键盘上沿高度减去列表下面的底部 Tab（安卓 ime 不含导航栏，用 bottomInset 换算）。
    // 挂在原生视图上：FlashList 的 contentContainerStyle 收不到 unistyles 运行时的键盘高度更新
    marginBottom: { xs: Math.max(0, bottomInset(rt.insets.bottom, rt.insets.ime) - theme.size.tabBar - rt.insets.bottom), md: rt.insets.ime },
  },
  footer: (narrow: boolean) => ({ height: narrow ? theme.size.contacts.rowNarrow : theme.size.contacts.row, alignItems: 'center', justifyContent: 'center' }),
  footerText: { ...theme.typography.contactsName, color: theme.colors.regularText },
  empty: { minHeight: theme.size.contacts.empty, padding: theme.spacing.xxl },
  emptyText: { ...theme.typography.listHint, color: theme.colors.regularText },
  compact: { position: 'absolute', left: 0, right: 0, height: theme.size.compactBar, flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.spacing.lg, backgroundColor: theme.colors.headerBg },
  compactTitle: { flex: 1, justifyContent: 'center', height: theme.size.compactBar },
  compactText: { ...theme.typography.barTitle, color: theme.colors.titleText, textAlign: 'center' },
}));
