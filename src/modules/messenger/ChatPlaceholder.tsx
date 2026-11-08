import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useEffect } from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useT } from '../../i18n';
import { IconButton } from '../../ui/IconButton';
import { useSplitView } from '../../ui/layout';
import { PageHeader } from '../../ui/PageHeader';
import { PlaceholderScreen } from '../../ui/PlaceholderScreen';
import { DialogList } from './DialogList';
import { useDialog, useMessenger } from './hooks';

/** 消息首页：窄屏是会话列表；并排视图里列表在左边，右边提示选一个会话 */
export function MessengerHome() {
  const t = useT();
  const split = useSplitView();
  if (!split) return <DialogList />;
  return <PlaceholderScreen title="" subtitle={t('messenger:pick')} />;
}

/** 聊天窗口（N3 实现前的占位）：标出正在看的会话，列表里的草稿、已读跟着它走 */
export function ChatPlaceholder({ dialogId }: { dialogId: number }) {
  const t = useT();
  const split = useSplitView();
  const messenger = useMessenger();
  const d = useDialog(dialogId);
  useEffect(() => {
    if (!messenger || !dialogId) return;
    void messenger.openDialog(dialogId);
    return () => messenger.closeDialog(dialogId);
  }, [messenger, dialogId]);
  return (
    <View style={styles.root}>
      <PageHeader
        title={d?.name ?? ''}
        left={!split && <IconButton icon={ChevronLeft} label={t('back')} onPress={() => (router.canGoBack() ? router.back() : router.navigate('/messenger'))} />}
      />
      <PlaceholderScreen title={d?.name ?? ''} subtitle={t('wip')} />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
}));
