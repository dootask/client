import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { dateFormats, useLanguage, useT } from '../../../../i18n';
import { toUnix } from '../../../../sync/messenger';
import { Sheet } from '../../../../ui/layout';
import { Segmented } from '../../../../ui/Segmented';
import { useMsgActions } from '../../hooks';
import { formatMoment } from '../format';
import { UserCheckRow } from './UserCheckRow';

type Tab = 'read' | 'unread';
type ReadRow = { userid: number; at: number };

/** 自己发的消息的已读名单：已读 / 未读两栏，已读的人带已读时间 */
export function ReadListSheet({ msgId, visible, onClose }: { msgId: number; visible: boolean; onClose: () => void }) {
  const t = useT();
  const { theme } = useUnistyles();
  const actions = useMsgActions();
  const language = useLanguage();
  const [rows, setRows] = useState<ReadRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  // 没选过时：有人读了看已读，还没人读看未读
  const [picked, setTab] = useState<Tab | null>(null);

  useEffect(() => {
    if (!actions) return;
    let alive = true;
    actions
      .readList(msgId)
      .then(
        (list) =>
          alive &&
          setRows(
            list.map((r) => ({
              userid: r.userid,
              at: toUnix(r.read_at) * 1000,
            })),
          ),
      )
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [actions, msgId]);

  const read = rows?.filter((r) => r.at > 0).sort((a, b) => b.at - a.at) ?? [];
  const unread = rows?.filter((r) => r.at === 0) ?? [];
  const tab = picked ?? (rows && read.length === 0 ? 'unread' : 'read');
  const data = tab === 'read' ? read : unread;
  const formats = dateFormats(language);

  return (
    <Sheet visible={visible} onClose={onClose} title={t('messenger:read.title')} fill>
      <View style={styles.top}>
        <Segmented
          items={[
            {
              key: 'read',
              label: `${t('messenger:read.read')} (${read.length})`,
            },
            {
              key: 'unread',
              label: `${t('messenger:read.unread')} (${unread.length})`,
            },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>
      {rows ? (
        <FlashList
          data={data}
          keyExtractor={(r) => String(r.userid)}
          renderItem={({ item }) => (
            <UserCheckRow userid={item.userid} trailing={item.at > 0 ? <Text style={styles.moment}>{formatMoment(item.at, formats)}</Text> : undefined} />
          )}
          ListEmptyComponent={<Text style={styles.hint}>{t('none')}</Text>}
        />
      ) : failed ? (
        <Text style={styles.hint}>{t('loadFailed')}</Text>
      ) : (
        <ActivityIndicator color={theme.colors.text3} style={styles.hint} />
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create((theme) => ({
  top: {
    paddingHorizontal: theme.spacing.page,
    paddingBottom: theme.spacing.md,
  },
  hint: {
    ...theme.typography.subhead,
    color: theme.colors.text3,
    textAlign: 'center',
    padding: theme.spacing.xxl,
  },
  moment: {
    ...theme.typography.footnote,
    color: theme.colors.text3,
    fontVariant: ['tabular-nums'],
  },
}));
