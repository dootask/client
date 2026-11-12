import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import { IconButton } from '../../../ui/IconButton';
import { PageHeader } from '../../../ui/PageHeader';
import { MergeDetail } from './MergeDetail';
import type { OpenMerge } from './mergeDetail';

/** 推入合并转发详情页（App）；嵌套的合并转发再推一页 */
export const pushMerge = (dialogId: number): OpenMerge => (msgId, title) =>
  router.push({ pathname: '/messenger/merge/[msgId]', params: { msgId, dialogId, title } });

/** 合并转发详情页（旧版 App MergeDetailScreen）：导航栏标题是卡片标题 */
export function MergeRoute() {
  const t = useT();
  const params = useLocalSearchParams<{ msgId: string; dialogId: string; title?: string }>();
  const msgId = Number(params.msgId) || 0;
  const dialogId = Number(params.dialogId) || 0;
  return (
    <View style={styles.root}>
      <PageHeader
        title={params.title ?? ''}
        left={<IconButton icon={ChevronLeft} label={t('back')} onPress={() => (router.canGoBack() ? router.back() : router.navigate(`/messenger/${dialogId}`))} />}
      />
      <MergeDetail key={msgId} msgId={msgId} dialogId={dialogId} openMerge={pushMerge(dialogId)} />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: { flex: 1, backgroundColor: theme.colors.bg },
}));
