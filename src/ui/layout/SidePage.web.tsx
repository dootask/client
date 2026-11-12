import { X } from 'lucide-react-native';
import { useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import Animated, { type CSSTransitionProperties } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../i18n';
import { Icon } from '../Icon';
import { Touchable } from '../Touchable';
import type { SidePageProps } from './SidePage';

export type { SidePageProps } from './SidePage';

/** 网页上盖在聊天页上面（聊天页保持显示），抽屉自己画遮罩 */
export const SIDE_PAGE_OPTIONS = { presentation: 'transparentModal', animation: 'none' } as const;

const TRANSITION: CSSTransitionProperties = { transitionProperty: ['transform'], transitionDuration: 220, transitionTimingFunction: 'ease-out' };

/**
 * 会话二级页（同旧版网页 .overlay-body）：宽屏右侧抽屉从右推入、带遮罩，点遮罩关闭；窄屏全屏覆盖。
 * 右上角关闭按钮，Esc 关闭；标题由页面自己画，抽屉样式（drawer）时这里画标题栏
 */
export function SidePage({ title, onClose, drawer = false, width: fixedWidth, testID, children }: SidePageProps) {
  const t = useT();
  const { theme, rt } = useUnistyles();
  const narrow = rt.breakpoint === 'xs';
  // Modal 画在最上层，会盖住后面压进来的页面（如从资料页进入的聊天）；窄屏全屏覆盖，不在最上面时就不画
  const focused = useIsFocused();
  const width = fixedWidth ?? (drawer ? theme.size.sidePage.drawer : theme.size.sidePage.width);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    // 先以收起的样子画出来，下一帧再展开，过渡才会生效
    const frame = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <Modal visible={focused || !narrow} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        {!narrow && <Pressable style={styles.mask} onPress={onClose} accessibilityLabel={t('close')} />}
        <Animated.View testID={testID} style={[styles.panel(narrow, drawer, width), { transform: [{ translateX: shown || narrow ? 0 : width }] }, TRANSITION]}>
          {drawer && (
            <View style={styles.bar}>
              <Text testID={testID && `${testID}-title`} style={styles.title} numberOfLines={1}>{title}</Text>
            </View>
          )}
          {children}
          <Touchable style={styles.close(narrow || drawer)} onPress={onClose} accessibilityLabel={t('close')}>
            <Icon icon={X} color={theme.colors.descText} size={theme.size.iconSmall} />
          </Touchable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end' },
  mask: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.colors.modalMask },
  panel: (narrow: boolean, drawer: boolean, width: number) => ({
    width: narrow ? '100%' : width,
    height: '100%',
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    ...(drawer && !narrow && { borderTopLeftRadius: theme.radius.drawer, borderBottomLeftRadius: theme.radius.drawer }),
  }),
  bar: {
    height: theme.size.sidePage.drawerBar,
    justifyContent: 'center',
    paddingLeft: theme.spacing.lg,
    paddingRight: theme.size.sidePage.close + theme.size.sidePage.closeInset,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.separator,
  },
  title: { ...theme.typography.body, color: theme.colors.regularText },
  /** 窄屏、抽屉标题栏里靠得更近（抽屉里居中于 56 高的标题栏） */
  close: (tight: boolean) => ({
    position: 'absolute',
    top: tight ? theme.size.sidePage.closeInsetNarrow : theme.size.sidePage.closeInset,
    right: tight ? theme.size.sidePage.closeInsetNarrow : theme.size.sidePage.closeInset,
    width: theme.size.sidePage.close,
    height: theme.size.sidePage.close,
    alignItems: 'center',
    justifyContent: 'center',
  }),
}));
