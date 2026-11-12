import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { ActivityIndicator, ScrollView, Text } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import { bodyImages } from '../../../sync/messenger/body';
import { openMedia } from '../../media';
import { bubbleTones } from './bubbleTones';
import { useLongBlocks } from './longText';
import { useOpenHref } from './openHref';
import { RichBlocks, RichHandlersContext, type RichHandlers } from './RichText';

/** 网页的长文阅读页（同旧版网页 /single/file/msg）：新标签页里整页显示全文，没有标题栏，页内查找用浏览器的 */
export function LongTextRoute() {
  const t = useT();
  const { theme } = useUnistyles();
  const msgId = Number(useLocalSearchParams<{ msgId: string }>().msgId) || 0;
  const { blocks, failed } = useLongBlocks(msgId);
  const title = t('messenger:long.title');
  useEffect(() => {
    document.title = title;
  }, [title]);
  const openHref = useOpenHref();
  const handlers = useMemo<RichHandlers>(
    () => ({
      onPressRun: (run) => run.href && openHref(run.href),
      onPressImage: (block) => {
        if (!block.url || !blocks) return;
        const urls = bodyImages({ kind: 'rich', blocks });
        openMedia({ kind: 'pictures', items: urls.map((url) => ({ url })), position: Math.max(0, urls.indexOf(block.url)) });
      },
    }),
    [blocks, openHref],
  );
  if (!blocks) return failed ? <Text style={styles.failed}>{t('loadFailed')}</Text> : <ActivityIndicator style={styles.loading} color={theme.colors.text3} />;
  return (
    <RichHandlersContext.Provider value={handlers}>
      <ScrollView style={styles.page} contentContainerStyle={styles.body}>
        <RichBlocks blocks={blocks} tone={bubbleTones(theme).peer} />
      </ScrollView>
    </RichHandlersContext.Provider>
  );
}

const styles = StyleSheet.create((theme) => ({
  page: { flex: 1, backgroundColor: theme.colors.surface },
  body: { padding: theme.size.markdown.page },
  loading: { marginTop: theme.spacing.xxl * 2 },
  failed: { ...theme.typography.subhead, marginTop: theme.spacing.xxl * 2, textAlign: 'center', color: theme.colors.text3 },
}));
