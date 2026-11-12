import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { dateFormats, useLanguage, useT } from '../../../i18n';
import { dialogApi } from '../../../sync/api';
import type { Dialog, Msg } from '../../../sync/api/dialog';
import { toUnix } from '../../../sync/messenger';
import { bodyPictures, msgContent } from '../../../sync/messenger/body';
import { availableMsgTypes, MSG_FILTER_TYPES, type MsgFilterType } from '../../../sync/messenger/rules';
import { SidePage, useSplitView } from '../../../ui/layout';
import { Touchable } from '../../../ui/Touchable';
import { api, useSession } from '../../session';
import { TodoStrip } from '../chat/ChatBanners';
import { formatMoment } from '../chat/format';
import { openGallery } from '../chat/gallery';
import { useDialog, useMessenger, useMsgActions } from '../hooks';
import { ContentRow } from './ContentRow';
import { pictureRows } from './contentModel';
import { closeContentPage, locateInChat } from './navigation';
import { PageTitle } from './PageTitle';
import { TypeTabs } from './TypeTabs';
import { useContentPage } from './useContentPage';

export function MediaRoute() {
  const { dialogId, type } = useLocalSearchParams<{ dialogId: string; type?: string }>();
  return <MediaScreen key={dialogId} dialogId={Number(dialogId) || 0} initialType={MSG_FILTER_TYPES.find((one) => one === type) ?? null} />;
}

/** initialType：从聊天页分类条点进来时先选中的分类 */
function MediaScreen({ dialogId, initialType }: { dialogId: number; initialType: MsgFilterType | null }) {
  const t = useT();
  const { theme } = useUnistyles();
  const stored = useDialog(dialogId);
  const messenger = useMessenger();
  const [remote, setRemote] = useState<Dialog | null>(null);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<MsgFilterType | null>(initialType);
  useEffect(() => {
    let stale = false;
    dialogApi.one(api, dialogId).then((dialog) => {
      if (stale) return;
      messenger?.patchDialog(dialog);
      setRemote(dialog);
    }).catch(() => !stale && setFailed(true));
    return () => { stale = true; };
  }, [dialogId, messenger]);
  const dialog = stored ?? remote;
  const types = dialog ? availableMsgTypes(dialog, selected) : [];
  const type = selected ?? types[0];
  return (
    <SidePage title={t('messenger:chatMedia.title')} testID="content-panel" onClose={() => closeContentPage(dialogId)}>
      <PageTitle title={t('messenger:chatMedia.title')} />
      {type ? (
        <>
          <TypeTabs types={types} selected={type} todoNum={dialog?.todo_num ?? 0} onSelect={setSelected} />
          <MediaList key={type} dialogId={dialogId} type={type} todoNum={dialog?.todo_num ?? 0} />
        </>
      ) : !dialog && !failed ? <ActivityIndicator color={theme.colors.text3} style={styles.loading} /> : <Text testID="content-empty" style={styles.empty}>{t(failed ? 'loadFailed' : 'messenger:chat.empty')}</Text>}
    </SidePage>
  );
}

function MediaList({ dialogId, type, todoNum }: { dialogId: number; type: MsgFilterType; todoNum: number }) {
  const t = useT();
  const { theme } = useUnistyles();
  const wide = useSplitView();
  const language = useLanguage();
  const userId = useSession((s) => s.user?.userid ?? 0);
  const server = useSession((s) => s.server);
  const actions = useMsgActions();
  const ctx = useMemo(() => ({ userId, origin: `${server}/` }), [userId, server]);
  const hasPicture = useCallback((msg: Msg) => bodyPictures(msgContent(msg, ctx).body).length > 0, [ctx]);
  const { msgs, failed, loading, loadMore, retry } = useContentPage(dialogId, type, type === 'image' ? hasPicture : undefined);
  const items = useMemo(() => {
    const formats = dateFormats(language);
    const rows = (msgs ?? []).map((msg) => {
      const at = new Date(toUnix(msg.created_at) * 1000);
      return { msg, body: msgContent(msg, ctx).body, date: formatMoment(at.getTime(), formats), month: formats.yearMonth(at) };
    });
    // 只在每月第一条显示月份标题
    return rows.map((row, index) => (index > 0 && rows[index - 1].month === row.month ? { ...row, month: '' } : row));
  }, [msgs, ctx, language]);
  const [width, setWidth] = useState<number>(theme.size.sidePage.width);
  const columns = wide ? theme.size.contentPages.imageColumns : theme.size.contentPages.imageColumnsNarrow;
  const tile = Math.min(theme.size.contentPages.image, (width - theme.spacing.lg * 2 - theme.size.contentPages.imageGap * (columns - 1)) / columns);
  const pictures = useMemo(() => pictureRows(items, columns), [items, columns]);
  const jump = useCallback((id: number) => locateInChat(dialogId, id), [dialogId]);
  const gallery = (url: string) => openGallery({ msgs: [...(msgs ?? [])].reverse(), ctx, url, older: actions ? (prevId) => actions.imagePage(dialogId, prevId) : undefined });
  const footer = failed ? <Touchable accessibilityRole="button" onPress={retry}><Text style={styles.empty}>{t('loadFailed')}</Text></Touchable> : loading ? <ActivityIndicator style={styles.loading} color={theme.colors.text3} /> : null;
  if (!msgs) return footer;
  const header = type === 'todo' ? <TodoStrip dialogId={dialogId} todoNum={todoNum} onJump={jump} /> : null;
  const empty = <Text testID="content-empty" style={styles.empty}>{t('messenger:chat.empty')}</Text>;
  if (type === 'image') {
    return (
      <View style={styles.grow} onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}>
      <FlashList testID="content-images" data={pictures} keyExtractor={(row) => row.key} contentContainerStyle={styles.list} ListEmptyComponent={empty} ListFooterComponent={footer} onEndReached={loadMore} onEndReachedThreshold={0.5} renderItem={({ item }) => (
        <View style={styles.imageGroup}>
          {!!item.day && <Text style={styles.day}>{dateFormats(language).full(new Date(toUnix(`${item.day} 00:00:00`) * 1000))}</Text>}
          <View style={styles.grid}>
            {item.pictures.map((picture) => (
              <Touchable key={picture.key} testID={`content-image-${picture.key}`} accessibilityRole="button" accessibilityLabel={t('messenger:filter.image')} onPress={() => gallery(picture.url)} style={styles.image(tile)}>
                <Image source={picture.src} recyclingKey={picture.key} contentFit="cover" style={StyleSheet.absoluteFill} />
              </Touchable>
            ))}
          </View>
        </View>
      )} />
      </View>
    );
  }
  return (
    <FlashList testID={`content-${type}`} data={items} keyExtractor={(item) => String(item.msg.id)} contentContainerStyle={styles.list} ListHeaderComponent={header} ListEmptyComponent={empty} ListFooterComponent={footer} onEndReached={loadMore} onEndReachedThreshold={0.5} renderItem={({ item }) => <ContentRow {...item} type={type} onLocate={() => jump(item.msg.id)} onReply={() => locateInChat(dialogId, item.msg.id, true)} />} />
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  list: { paddingBottom: rt.insets.bottom + theme.spacing.xxl },
  loading: { marginVertical: theme.spacing.lg },
  empty: { height: theme.size.contentPages.empty, ...theme.typography.contentText, textAlign: 'center', paddingVertical: theme.spacing.sm, margin: theme.spacing.lg, backgroundColor: theme.colors.surface, color: theme.colors.regularText },
  day: { ...theme.typography.contentInfo, color: theme.colors.text3, paddingBottom: theme.spacing.sm },
  imageGroup: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.size.contentPages.imageGap },
  grid: { flexDirection: 'row', gap: theme.size.contentPages.imageGap },
  grow: { flex: 1 },
  image: (tile: number) => ({ width: tile, height: tile, backgroundColor: theme.colors.fill }),
}));
