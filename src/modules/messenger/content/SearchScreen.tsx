import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { useLocalSearchParams } from 'expo-router';
import { ChevronDown, ChevronUp, Search } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Text, TextInput, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { dateFormats, useLanguage, useT } from '../../../i18n';
import { dialogApi } from '../../../sync/api';
import { toUnix } from '../../../sync/messenger';
import { msgContent } from '../../../sync/messenger/body';
import { UserAvatar } from '../../../ui/Avatar';
import { Icon } from '../../../ui/Icon';
import { SidePage, useSplitView } from '../../../ui/layout';
import { showToast } from '../../../ui/Toast';
import { Touchable } from '../../../ui/Touchable';
import { api, useSession } from '../../session';
import { formatMoment } from '../chat/format';
import { PreviewText } from '../PreviewText';
import { highlightParts, resultPreview } from './contentModel';
import { closeContentPage, locateInChat } from './navigation';
import { PageTitle } from './PageTitle';

const DEBOUNCE = 600;
type SearchMsg = Awaited<ReturnType<typeof dialogApi.searchMsgs>>[number];
type SearchResult = { key: string; list: SearchMsg[]; failed?: boolean };

export function SearchRoute() {
  const { dialogId } = useLocalSearchParams<{ dialogId: string }>();
  return <SearchScreen key={dialogId} dialogId={Number(dialogId) || 0} />;
}

function SearchScreen({ dialogId }: { dialogId: number }) {
  const t = useT();
  const { theme } = useUnistyles();
  const wide = useSplitView();
  const [input, setInput] = useState('');
  const [result, setResult] = useState<SearchResult | null>(null);
  const key = input.trim();
  const listRef = useRef<FlashListRef<SearchMsg>>(null);
  const [position, setPosition] = useState({ key: '', index: 0 });
  useEffect(() => {
    if (!key || !dialogId) return;
    let stale = false;
    const timer = setTimeout(() => {
      dialogApi.searchMsgs(api, dialogId, key).then((list) => {
        if (stale) return;
        setResult({ key, list });
        if (!list.length) showToast(t('messenger:dialogSearch.noResult'));
      }).catch(() => !stale && setResult({ key, list: [], failed: true }));
    }, DEBOUNCE);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [dialogId, key, t]);
  const current = key && result?.key === key ? result : null;
  const loading = !!key && !current;
  const index = position.key === key ? Math.min(position.index, Math.max(0, (current?.list.length ?? 0) - 1)) : 0;
  const move = (offset: number) => {
    const target = index + offset;
    if (!current || target < 0 || target >= current.list.length) return;
    setPosition({ key, index: target });
    void listRef.current?.scrollToIndex({ index: target, viewPosition: 0.5, animated: false });
  };
  return (
    <SidePage title={t('messenger:dialogSearch.title')} testID="search-panel" onClose={() => closeContentPage(dialogId)}>
      <PageTitle title={t('messenger:dialogSearch.title')} />
      <View style={styles.header(wide)}>
        <Touchable testID="search-prev" accessibilityRole="button" accessibilityLabel={t('messenger:dialogSearch.previous')} disabled={!current?.list.length || index === 0} onPress={() => move(-1)} style={styles.arrow}>
          <Icon icon={ChevronUp} color={theme.colors.regularText} size={theme.size.contentPages.searchArrowIcon} />
        </Touchable>
        <Touchable testID="search-next" accessibilityRole="button" accessibilityLabel={t('messenger:dialogSearch.next')} disabled={!current?.list.length || index >= current.list.length - 1} onPress={() => move(1)} style={styles.arrow}>
          <Icon icon={ChevronDown} color={theme.colors.regularText} size={theme.size.contentPages.searchArrowIcon} />
        </Touchable>
        <View style={styles.box}>
          <View style={styles.prefix}>
            {loading ? <ActivityIndicator size="small" color={theme.colors.searchIcon} /> : <Icon icon={Search} size={theme.size.contentPages.searchIcon} color={theme.colors.searchIcon} />}
          </View>
          <TextInput testID="dialog-search-input" value={input} onChangeText={setInput} placeholder={t('messenger:dialogSearch.placeholder')} placeholderTextColor={theme.colors.placeholder} autoFocus returnKeyType="search" clearButtonMode="while-editing" style={styles.input} />
          {!!current?.list.length && <Text testID="search-count" style={styles.counter}>{index + 1}/{current.list.length}</Text>}
        </View>
        <Touchable testID="search-cancel" accessibilityRole="button" onPress={() => closeContentPage(dialogId)} style={styles.cancel}>
          <Text style={styles.cancelText}>{t('messenger:dialogSearch.cancel')}</Text>
        </Touchable>
      </View>
      {current?.failed ? <Text style={styles.empty}>{t('loadFailed')}</Text> : (
        <FlashList ref={listRef} testID="dialog-search-results" data={current?.list ?? []} keyExtractor={(msg) => String(msg.id)} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.list} ListEmptyComponent={key && !loading ? <Text testID="search-empty" style={styles.empty}>{t('messenger:chat.empty')}</Text> : null} extraData={index} renderItem={({ item, index: rowIndex }) => <ResultRow msg={item} active={rowIndex === index} keyword={key} onPress={() => locateInChat(dialogId, item.id)} />} />
      )}
    </SidePage>
  );
}

function ResultRow({ msg, active, keyword, onPress }: { msg: SearchMsg; active: boolean; keyword: string; onPress: () => void }) {
  const { theme } = useUnistyles();
  const language = useLanguage();
  const userId = useSession((s) => s.user?.userid ?? 0);
  const server = useSession((s) => s.server);
  const preview = useMemo(() => resultPreview(msg, msgContent(msg, { userId, origin: `${server}/` }).body), [msg, userId, server]);
  const parts = highlightParts(preview.text, keyword);
  return (
    <Touchable testID={`search-result-${msg.id}`} accessibilityRole="button" onPress={onPress} style={[styles.row, active && styles.active]}>
      <UserAvatar userid={msg.userid} name={msg.user?.nickname ?? ''} uri={msg.user?.userimg} bot={!!msg.user?.bot} size={theme.size.avatar.lg} />
      <View style={styles.main}>
        <View style={styles.rowHead}>
          <Text style={styles.name} numberOfLines={1}>{msg.user?.nickname ?? ''}</Text>
          <Text style={styles.date}>{formatMoment(toUnix(msg.created_at) * 1000, dateFormats(language))}</Text>
        </View>
        <Text style={styles.text} numberOfLines={2}>
          <PreviewText preview={{ ...preview, text: parts.before }} />
          {!!parts.match && <Text style={styles.match}>{parts.match}</Text>}{parts.after}
        </Text>
      </View>
    </Touchable>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  header: (wide: boolean) => ({ height: wide ? theme.size.contentPages.searchWide : theme.size.contentPages.searchNarrow, flexDirection: 'row', alignItems: 'center', paddingLeft: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.paneLine, backgroundColor: theme.colors.surface }),
  arrow: { width: theme.size.contentPages.searchArrow, alignItems: 'center', justifyContent: 'center' },
  counter: { ...theme.typography.contentText, color: theme.colors.regularText, paddingHorizontal: theme.spacing.md },
  active: { backgroundColor: theme.colors.rowActive },
  box: { marginLeft: theme.spacing.md, flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface },
  prefix: { height: theme.size.contentPages.searchPrefix, width: theme.size.contentPages.searchPrefix, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, minWidth: 0, padding: 0, ...theme.typography.contentText, color: theme.colors.titleText, outlineStyle: 'solid', outlineWidth: 0 },
  cancel: { paddingHorizontal: theme.size.contentPages.titleTop },
  cancelText: { ...theme.typography.contentText, color: theme.colors.primary },
  list: { paddingBottom: rt.insets.bottom + theme.spacing.xxl },
  empty: { height: theme.size.contentPages.empty, ...theme.typography.contentText, textAlign: 'center', paddingVertical: theme.spacing.sm, margin: theme.spacing.lg, backgroundColor: theme.colors.surface, color: theme.colors.regularText },
  row: { flexDirection: 'row', gap: theme.spacing.md, paddingLeft: theme.spacing.page, paddingTop: theme.spacing.md },
  main: { flex: 1, minWidth: 0, gap: theme.size.listLineGap, paddingRight: theme.spacing.page, paddingBottom: theme.spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.separator },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  name: { flex: 1, ...theme.typography.footnote, color: theme.colors.text3 },
  date: { ...theme.typography.caption, color: theme.colors.text3 },
  text: { ...theme.typography.body, color: theme.colors.text },
  match: { ...theme.typography.contentMatch, color: theme.colors.primaryText },
}));
