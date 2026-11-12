import { X } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../i18n';
import { Icon } from './Icon';
import { Touchable } from './Touchable';

export interface DooModalProps {
  visible: boolean;
  /** 点右上关闭、Esc、Android 返回键 */
  onClose: () => void;
  title?: string;
  /** 标题区下内边距，不给为 20（确认转发的头像行贴得近，是 14） */
  headerBottom?: number;
  /** 卡片宽（宽屏）；窄屏不超过屏宽减外边距 */
  width: number;
  /** 卡片固定高（如选择成员 620），不给按内容 */
  height?: number;
  /** 铺满整屏：没有圆角和右上关闭（全屏页自己放取消 / 返回） */
  fullscreen?: boolean;
  /** 正文不加内边距（内容自己排版，如选择成员） */
  bare?: boolean;
  /** 底部按钮（DooButton，按「取消、操作」的顺序写）：宽屏靠右一行，窄屏等分 */
  footer?: ReactNode;
  children: ReactNode;
  testID?: string;
}

/**
 * 旧版网页通用弹窗（DooModal）：遮罩上居中的圆角卡片，标题、正文、底部按钮；点遮罩不关。
 * 只在打开时渲染内容
 */
export function DooModal({ visible, onClose, title, headerBottom, width, height, fullscreen = false, bare = false, footer, children, testID }: DooModalProps) {
  const t = useT();
  const { theme, rt } = useUnistyles();
  const narrow = rt.breakpoint === 'xs';
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <View style={styles.wrap(fullscreen, narrow)}>
        <Pressable style={styles.mask} accessible={false} />
        <View testID={testID} style={styles.card(fullscreen, width, height)}>
          {!fullscreen && (
            <Touchable accessibilityRole="button" accessibilityLabel={t('close')} onPress={onClose} style={styles.close}>
              {({ hovered }) => <Icon icon={X} color={hovered ? theme.colors.modalCloseHover : theme.colors.modalClose} size={theme.size.dooModal.closeIcon} strokeWidth={1.5} />}
            </Touchable>
          )}
          {!!title && (
            <View style={styles.header(headerBottom)}>
              <Text style={styles.title} numberOfLines={1} accessibilityRole="header">{title}</Text>
            </View>
          )}
          <View style={styles.body(bare, !!title)}>{children}</View>
          {footer && <View style={styles.footer(narrow)}>{footer}</View>}
        </View>
      </View>
    </Modal>
  );
}

/** 弹窗底部按钮（旧版 DooButton）：宽屏高 36 的圆角块，窄屏高 48 的等分胶囊 */
export function DooButton({ label, primary = false, disabled = false, suffix, onPress }: {
  label: string;
  primary?: boolean;
  disabled?: boolean;
  /** 文字后的附加内容（如快捷键提示） */
  suffix?: ReactNode;
  onPress: () => void;
}) {
  const { rt } = useUnistyles();
  const narrow = rt.breakpoint === 'xs';
  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={label}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed, hovered }) => styles.button(narrow, primary, disabled, hovered, pressed)}
    >
      <Text style={styles.buttonText(narrow, primary)} numberOfLines={1}>{label}</Text>
      {suffix}
    </Touchable>
  );
}

const styles = StyleSheet.create((theme, rt) => {
  const m = theme.size.dooModal;
  return {
    wrap: (fullscreen: boolean, narrow: boolean) => ({
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: fullscreen ? 0 : rt.insets.top + m.wrapY,
      paddingBottom: fullscreen ? 0 : rt.insets.bottom + m.wrapY,
      paddingHorizontal: fullscreen ? 0 : narrow ? m.wrapXNarrow : m.wrapX,
    }),
    mask: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.colors.modalMask },
    card: (fullscreen: boolean, width: number, height: number | undefined) =>
      fullscreen
        ? { width: '100%', height: '100%', paddingTop: rt.insets.top, paddingBottom: rt.insets.bottom, backgroundColor: theme.colors.surface }
        : {
            width,
            maxWidth: '100%',
            height,
            maxHeight: '100%',
            borderRadius: m.radius,
            backgroundColor: theme.colors.surface,
            boxShadow: theme.shadow.modal,
            overflow: 'hidden',
          },
    close: { position: 'absolute', top: m.closeTop, right: m.closeRight, zIndex: 1, width: m.close, height: m.close, alignItems: 'center', justifyContent: 'center' },
    header: (bottom = m.headerBottom) => ({ paddingTop: m.headerTop, paddingHorizontal: m.headerX, paddingBottom: bottom }),
    title: { ...theme.typography.modalTitle, paddingRight: m.titleEnd, color: theme.colors.titleText },
    // 没有标题时正文顶部留出关闭按钮的位置
    body: (bare: boolean, titled: boolean) =>
      bare ? { flex: 1, minHeight: 0 } : { flexShrink: 1, minHeight: 0, paddingTop: titled ? m.bodyTop : m.closeTop + m.close - 2, paddingHorizontal: m.bodyX, paddingBottom: m.bodyBottom },
    footer: (narrow: boolean) => ({
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: m.footerGap,
      paddingTop: m.footerTop,
      paddingHorizontal: narrow ? m.footerXNarrow : m.footerX,
      paddingBottom: m.footerBottom,
    }),
    button: (narrow: boolean, primary: boolean, disabled: boolean, hovered: boolean, pressed: boolean) => ({
      height: narrow ? m.buttonNarrow : m.button,
      minWidth: narrow ? 0 : m.buttonMin,
      flex: narrow ? 1 : undefined,
      paddingHorizontal: narrow ? m.buttonPadXNarrow : m.buttonPadX,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: narrow ? m.buttonRadiusNarrow : theme.radius.block,
      backgroundColor: primary ? theme.colors.primary : theme.colors.dooButton,
      opacity: disabled ? theme.opacity.disabled : narrow && pressed ? theme.opacity.pressedPrimary : 1,
      // 悬停提亮一点（旧版主色按钮叠 15% 白）
      boxShadow: !disabled && primary && hovered ? `inset 0px 0px 0px 100px ${theme.colors.dooButtonHover}` : undefined,
    }),
    buttonText: (narrow: boolean, primary: boolean) => ({
      ...(narrow ? theme.typography.dooButtonNarrow : theme.typography.dooButton),
      color: primary ? theme.colors.onPrimary : theme.colors.dooButtonText,
    }),
  };
});
