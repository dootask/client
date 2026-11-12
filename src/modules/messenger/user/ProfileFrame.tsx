import { ChevronLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import { IconButton } from '../../../ui/IconButton';
import { PageHeader } from '../../../ui/PageHeader';
import { closeProfile } from './navigation';

export interface ProfileFrameProps {
  /** 导航栏标题：大名字滚出去之后才有 */
  title: string;
  children: ReactNode;
}

/** 资料页外框（App）：整页推入，左上返回 */
export function ProfileFrame({ title, children }: ProfileFrameProps) {
  const t = useT();
  return (
    <View style={styles.page}>
      <PageHeader title={title} left={<IconButton icon={ChevronLeft} label={t('back')} onPress={closeProfile} />} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  page: { flex: 1, backgroundColor: theme.colors.surface },
}));
