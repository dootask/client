import { FlashList } from '@shopify/flash-list';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useT } from '../../../../i18n';
import type { Reaction } from '../../../../sync/messenger/body';
import { Chip } from '../../../../ui/Chip';
import { Sheet } from '../../../../ui/layout';
import { showToast } from '../../../../ui/Toast';
import { useErrorText, useSession } from '../../../session';
import { openDialogRoute } from '../../DialogList';
import { useMessenger } from '../../hooks';
import { UserCheckRow } from './UserCheckRow';

/** 回应详情：每种表情一个胶囊切换，下面是回应的人，点别人打开和他的单聊 */
export function ReactionListSheet({
  reactions,
  symbol,
  visible,
  onClose,
}: {
  reactions: readonly Reaction[];
  /** 打开时选中的表情 */
  symbol: string;
  visible: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const messenger = useMessenger();
  const errorText = useErrorText();
  const userId = useSession((s) => s.user?.userid ?? 0);
  const [picked, setPicked] = useState(symbol);
  const current = reactions.find((r) => r.symbol === picked) ?? reactions[0];

  const openChat = (userid: number) => {
    if (!messenger) return;
    onClose();
    messenger
      .openUser(userid)
      .then((id) => openDialogRoute(id))
      .catch((err) => showToast(errorText(err)));
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={t('messenger:reaction.title')} fill>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs} contentContainerStyle={styles.tabsContent}>
        {reactions.map((r) => (
          <Chip key={r.symbol} label={`${r.symbol} ${r.userids.length}`} active={r.symbol === current?.symbol} onPress={() => setPicked(r.symbol)} />
        ))}
      </ScrollView>
      <FlashList
        data={current?.userids ?? []}
        keyExtractor={String}
        renderItem={({ item }) => <UserCheckRow userid={item} onPress={item === userId ? undefined : openChat} />}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create((theme) => ({
  tabs: { flexGrow: 0 },
  tabsContent: {
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.page,
    paddingBottom: theme.spacing.md,
  },
}));
