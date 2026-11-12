import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useT } from '../../i18n';
import { IconButton } from '../../ui/IconButton';
import { PageHeader } from '../../ui/PageHeader';
import { PlaceholderScreen } from '../../ui/PlaceholderScreen';

/** 推入的二级页还没写好时的占位：返回按钮 + 「开发中」 */
export function WipRoute() {
  const t = useT();
  return (
    <View style={styles.root}>
      <PageHeader title="" left={<IconButton icon={ChevronLeft} label={t('back')} onPress={() => (router.canGoBack() ? router.back() : router.navigate('/'))} />} />
      <PlaceholderScreen title="" subtitle={t('wip')} />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: { flex: 1, backgroundColor: theme.colors.bg },
}));
