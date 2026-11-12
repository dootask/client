import { FlashList } from '@shopify/flash-list';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { dateFormats, useLanguage, useT } from '../../../i18n';
import { toUnix } from '../../../sync/messenger';
import { msgContent } from '../../../sync/messenger/body';
import { useSession } from '../../session';
import { useToday } from '../clock';
import { bubbleTones } from './bubbleTones';
import { dayLabel } from './format';
import { openGallery } from './gallery';
import { openMergeItem, useMergeMsgs, type OpenMerge } from './mergeDetail';
import { MergeRow } from './MsgBubble';
import { useOpenHref } from './openHref';
import { RichHandlersContext, type RichHandlers } from './RichText';
import { rowTraits } from './rowTraits';

/**
 * 合并转发详情：只读的聊天记录，每条的样子见各端 MergeRow（App 头像加浅底气泡、换天插日期；网页同聊天行）。
 * 点气泡打开图片（只在详情里的图之间翻）、视频、文件、语音、位置，嵌套的合并转发再开一层（openMerge）
 */
export function MergeDetail({ msgId, dialogId, openMerge }: { msgId: number; dialogId: number; openMerge: OpenMerge }) {
  const t = useT();
  const { theme } = useUnistyles();
  const language = useLanguage();
  const today = useToday();
  const userId = useSession((s) => s.user?.userid ?? 0);
  const server = useSession((s) => s.server);
  const { msgs, failed } = useMergeMsgs(msgId, dialogId);
  const tones = useMemo(() => bubbleTones(theme), [theme]);
  const rows = useMemo(() => {
    if (!msgs) return null;
    const formats = dateFormats(language);
    let lastDay = '';
    return msgs.map((msg) => {
      const day = dayLabel(toUnix(msg.created_at) * 1000, today, t, formats);
      const newDay = rowTraits.dayLabels && day !== lastDay;
      lastDay = day;
      return { msg, body: msgContent(msg, { userId, origin: `${server}/` }).body, day: newDay ? day : null };
    });
  }, [msgs, language, today, t, userId, server]);
  const open = useMemo(
    () => ({ merge: openMerge, image: (url: string) => openGallery({ msgs: msgs ?? [], ctx: { userId, origin: `${server}/` }, url }) }),
    [openMerge, msgs, userId, server],
  );
  const openHref = useOpenHref();
  const onPressRun = useCallback<NonNullable<RichHandlers['onPressRun']>>((run) => {
    if (run.href) openHref(run.href);
  }, [openHref]);
  const richHandlers = useMemo<RichHandlers>(
    () => ({ onPressRun, onPressImage: (block) => block.url && open.image(block.url) }),
    [onPressRun, open],
  );
  if (!rows) return failed ? <Text style={styles.placeholder}>{t('loadFailed')}</Text> : <ActivityIndicator style={styles.placeholder} color={theme.colors.text3} />;
  return (
    <RichHandlersContext.Provider value={richHandlers}>
      <FlashList
        data={rows}
        keyExtractor={(row) => String(row.msg.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item: { msg, body, day } }) => (
          <View style={styles.item}>
            {day && <Text style={styles.day}>{day}</Text>}
            <MergeRow msg={msg} body={body} own={msg.userid === userId} tones={tones} onOpen={() => openMergeItem(msg, body, open, t)} />
          </View>
        )}
      />
    </RichHandlersContext.Provider>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  placeholder: { ...theme.typography.subhead, marginTop: theme.spacing.xxl * 2, textAlign: 'center', color: theme.colors.text3 },
  list: { paddingTop: theme.spacing.lg, paddingBottom: rt.insets.bottom, backgroundColor: theme.colors[rowTraits.listBg] },
  item: { gap: theme.spacing.lg, paddingBottom: theme.spacing.lg },
  day: { ...theme.typography.caption, textAlign: 'center', color: theme.colors.text3 },
}));
