import { ChevronLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useT } from '../../i18n';
import { IconButton } from '../IconButton';
import { PageHeader } from '../PageHeader';

export interface SidePageProps {
  /** App 上导航栏的标题（网页抽屉没有统一标题栏，页面自己画） */
  title: string;
  /** 返回 / 关闭 */
  onClose: () => void;
  /** App 导航栏右侧操作 */
  right?: ReactNode;
  children: ReactNode;
}

/** 会话的二级页（信息、成员、内容、举报等）在聊天栈里的路由选项：App 上是普通推入 */
export const SIDE_PAGE_OPTIONS = {};

/**
 * 会话的二级页外框：App 上是推入的整页（导航栏带返回）；网页上见 SidePage.web（右侧抽屉 / 窄屏全屏）
 */
export function SidePage({ title, onClose, right, children }: SidePageProps) {
  const t = useT();
  return (
    <View style={styles.root}>
      <PageHeader title={title} left={<IconButton icon={ChevronLeft} label={t('back')} onPress={onClose} />} right={right} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: { flex: 1, backgroundColor: theme.colors.bg },
}));
