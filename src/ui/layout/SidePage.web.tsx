import { X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
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
 * 右上角关闭按钮，Esc 关闭；标题由页面自己画
 */
export function SidePage({ onClose, children }: SidePageProps) {
  const t = useT();
  const { theme, rt } = useUnistyles();
  const narrow = rt.breakpoint === 'xs';
  const [shown, setShown] = useState(false);
  useEffect(() => {
    // 先以收起的样子画出来，下一帧再展开，过渡才会生效
    const frame = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        {!narrow && <Pressable style={styles.mask} onPress={onClose} accessibilityLabel={t('close')} />}
        <Animated.View style={[styles.panel(narrow), { transform: [{ translateX: shown || narrow ? 0 : theme.size.sidePage.width }] }, TRANSITION]}>
          {children}
          <Touchable style={styles.close(narrow)} onPress={onClose} accessibilityLabel={t('close')}>
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
  panel: (narrow: boolean) => ({
    width: narrow ? '100%' : theme.size.sidePage.width,
    height: '100%',
    backgroundColor: theme.colors.surface,
  }),
  close: (narrow: boolean) => ({
    position: 'absolute',
    top: narrow ? theme.size.sidePage.closeInsetNarrow : theme.size.sidePage.closeInset,
    right: narrow ? theme.size.sidePage.closeInsetNarrow : theme.size.sidePage.closeInset,
    width: theme.size.sidePage.close,
    height: theme.size.sidePage.close,
    alignItems: 'center',
    justifyContent: 'center',
  }),
}));
