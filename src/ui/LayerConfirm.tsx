import { useSyncExternalStore } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { DooButton } from './DooModal';

export interface LayerConfirmOptions {
  title: string;
  message?: string;
  okLabel: string;
  cancelLabel: string;
  onOk: () => void;
  tone?: 'danger' | 'warning';
  centered?: boolean;
}

/** 同一时间只有一个确认框；后开的替换先开的 */
let current: LayerConfirmOptions | null = null;
const listeners = new Set<() => void>();

function set(next: LayerConfirmOptions | null) {
  current = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

/** 弹出确认框（旧版网页 $A.modalConfirm）：宽屏左图标右标题、按钮靠右，窄屏居中、按钮等分；点遮罩不关，Esc / 返回键算取消 */
export function showLayerConfirm(options: LayerConfirmOptions) {
  set(options);
}

/** 挂在根布局里，显示当前的确认框 */
export function LayerConfirmHost() {
  const options = useSyncExternalStore(subscribe, () => current);
  const { theme, rt } = useUnistyles();
  if (!options) return null;
  const { buttonMin } = theme.size.layer;
  const narrow = rt.breakpoint === 'xs';
  const close = () => set(null);
  const ok = () => {
    close();
    options.onOk();
  };
  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={close}>
      <View style={styles.wrap}>
        <Pressable style={styles.mask} accessible={false} />
        <View style={styles.card(narrow)} role="dialog" aria-modal>
          {narrow ? (
            <Text style={styles.titleNarrow} accessibilityRole="header">{options.title}</Text>
          ) : (
            <View style={[styles.head, options.centered && styles.centered]}>
              <QuestionIcon warning={!!options.tone} />
              <Text style={styles.title} accessibilityRole="header">{options.title}</Text>
            </View>
          )}
          {!!options.message && <Text style={[narrow ? styles.messageNarrow : styles.message, options.centered && styles.centeredMessage]}>{options.message}</Text>}
          <View style={styles.footer(narrow)}>
            <DooButton label={options.cancelLabel} minWidth={buttonMin} onPress={close} />
            <DooButton label={options.okLabel} primary tone={options.tone} minWidth={buttonMin} onPress={ok} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

/** 宽屏标题前的图标：圆圈填色、问号描白（旧版 iView 确认框的实心图标，路径取自 lucide circle-question-mark） */
function QuestionIcon({ warning }: { warning: boolean }) {
  const { theme } = useUnistyles();
  const { icon } = theme.size.layer;
  return (
    <View style={styles.icon}>
      <Svg width={icon} height={icon} viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Circle cx={12} cy={12} r={10} fill={theme.colors.ivuWarning} stroke={theme.colors.ivuWarning} />
        <Path d={warning ? 'M12 7v6' : 'M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3'} stroke={theme.colors.onPrimary} />
        <Path d="M12 17h.01" stroke={theme.colors.onPrimary} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => {
  const l = theme.size.layer;
  return {
    wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: rt.insets.top + l.narrowSide, paddingBottom: rt.insets.bottom + l.narrowSide },
    mask: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.colors.modalMask },
    card: (narrow: boolean) =>
      narrow
        ? {
            width: Math.min(l.narrowWidth, rt.screen.width - l.narrowSide * 2),
            paddingTop: l.narrowTop,
            paddingHorizontal: l.narrowX,
            paddingBottom: l.narrowBottom,
            borderRadius: l.narrowRadius,
            backgroundColor: theme.colors.surface,
            boxShadow: theme.shadow.layerNarrow,
          }
        : {
            width: l.width,
            maxWidth: '100%',
            paddingVertical: l.padY,
            paddingHorizontal: l.padX,
            borderRadius: l.radius,
            backgroundColor: theme.colors.surface,
            boxShadow: theme.shadow.modal,
          },
    head: { flexDirection: 'row', alignItems: 'center', minHeight: l.head, paddingRight: l.headEnd },
    centered: { justifyContent: 'center' },
    centeredMessage: { paddingLeft: 0, textAlign: 'center' },
    icon: { marginHorizontal: l.iconSide },
    title: { ...theme.typography.layerTitle, flexShrink: 1, marginLeft: l.iconGap, color: theme.colors.titleText },
    message: { ...theme.typography.layerMessage, paddingLeft: l.messageIndent, color: theme.colors.regularText },
    titleNarrow: { ...theme.typography.layerTitleNarrow, textAlign: 'center', color: theme.colors.text },
    messageNarrow: { ...theme.typography.layerMessageNarrow, paddingTop: l.narrowMessageTop, textAlign: 'center', color: theme.colors.text2 },
    footer: (narrow: boolean) => ({
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: l.gap,
      marginTop: narrow ? l.narrowFooterTop : l.footerTop,
    }),
  };
});
