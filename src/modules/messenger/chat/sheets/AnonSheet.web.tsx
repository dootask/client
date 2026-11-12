import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, TextInput, type TextInputInstance, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../../i18n';
import { showToast } from '../../../../ui/Toast';
import { Touchable } from '../../../../ui/Touchable';
import { useErrorText } from '../../../session';
import { useMsgActions } from '../../hooks';

const MAX_TEXT = 2000;

interface AnonSheetProps {
  userid: number;
  visible: boolean;
  onClose: () => void;
}

/** 关闭时连输入状态与订阅都不保留；App 继续使用原有 AnonSheet.tsx */
export function AnonSheet({ userid, visible, onClose }: AnonSheetProps) {
  return visible ? <AnonCard key={userid} userid={userid} onClose={onClose} /> : null;
}

/** 旧版网页匿名消息 layer：宽屏 416×245，窄屏 300×259 */
function AnonCard({ userid, onClose }: Omit<AnonSheetProps, 'visible'>) {
  const t = useT();
  const { theme, rt } = useUnistyles();
  const narrow = rt.breakpoint === 'xs';
  const actions = useMsgActions();
  const errorText = useErrorText();
  const input = useRef<TextInputInstance>(null);
  const active = useRef(true);
  const sending = useRef(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [closed, setClosed] = useState(false);
  const value = text.trim();

  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);

  const focus = useCallback(() => input.current?.focus(), []);
  const changeText = useCallback((next: string) => setText(next.slice(0, MAX_TEXT)), []);
  const close = useCallback(() => {
    active.current = false;
    setClosed(true);
    onClose();
  }, [onClose]);
  const submit = useCallback(async () => {
    if (!actions || !value || sending.current || !active.current) return;
    sending.current = true;
    setBusy(true);
    try {
      const msg = await actions.sendAnon(userid, value);
      if (!active.current) return;
      if (msg) showToast(msg);
      close();
    } catch (error) {
      if (active.current) showToast(errorText(error));
    } finally {
      sending.current = false;
      if (active.current) setBusy(false);
    }
  }, [actions, close, errorText, userid, value]);

  if (closed) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={close} onShow={focus}>
      <View style={styles.wrap}>
        <Pressable style={styles.mask} accessible={false} />
        <View style={styles.card(narrow)} role="dialog" aria-modal testID="wt-a-anon-card">
          <Text style={styles.title(narrow)} accessibilityRole="header">{t('messenger:group.anon.title')}</Text>
          <View style={styles.input(narrow)}>
            <TextInput
              ref={input}
              autoFocus
              multiline
              editable={!busy}
              value={text}
              onChangeText={changeText}
              maxLength={MAX_TEXT}
              accessibilityLabel={t('messenger:group.anon.title')}
              placeholder={t('messenger:group.anon.placeholder')}
              placeholderTextColor={theme.colors.text3}
              style={styles.text(narrow)}
            />
            <Text style={styles.count(narrow)}>{text.length}/{MAX_TEXT}</Text>
          </View>
          <View style={styles.footer(narrow)}>
            <Touchable
              accessibilityRole="button"
              accessibilityLabel={t('messenger:group.anon.cancel')}
              onPress={close}
              style={({ pressed }) => styles.button(narrow, false, false, pressed)}
            >
              <Text style={styles.buttonText(narrow, false)}>{t('messenger:group.anon.cancel')}</Text>
            </Touchable>
            <Touchable
              accessibilityRole="button"
              accessibilityLabel={t('messenger:group.anon.send')}
              disabled={!actions || !value || busy || userid <= 0}
              onPress={submit}
              style={({ pressed }) => styles.button(narrow, true, !actions || !value || busy || userid <= 0, pressed)}
            >
              {busy
                ? <ActivityIndicator color={theme.colors.onPrimary} size="small" />
                : <Text style={styles.buttonText(narrow, true)}>{t('messenger:group.anon.send')}</Text>}
            </Touchable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create((theme) => {
  const l = theme.size.layer;
  const a = theme.size.report.anon;
  const m = theme.size.dooModal;
  return {
    wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.lg },
    mask: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.colors.modalMask },
    card: (narrow: boolean) => ({
      width: narrow ? l.narrowWidth : l.width,
      maxWidth: '100%',
      height: narrow ? a.heightNarrow : a.height,
      paddingTop: narrow ? l.narrowTop : l.padY,
      paddingHorizontal: narrow ? l.narrowX : l.padX,
      paddingBottom: narrow ? l.narrowBottom : l.padY,
      borderRadius: narrow ? l.narrowRadius : l.radius,
      backgroundColor: theme.colors.surface,
      boxShadow: narrow ? theme.shadow.layerNarrow : theme.shadow.modal,
    }),
    title: (narrow: boolean) => ({
      ...(narrow ? theme.typography.layerTitleNarrow : theme.typography.layerTitle),
      color: narrow ? theme.colors.text : theme.colors.titleText,
      textAlign: narrow ? 'center' : 'left',
      marginBottom: narrow ? a.titleBottomNarrow : a.titleBottom,
    }),
    input: (narrow: boolean) => ({ height: narrow ? a.inputNarrow : a.input, backgroundColor: theme.colors.fill, borderRadius: theme.radius.block, overflow: 'hidden' }),
    text: (narrow: boolean) => ({
      ...(narrow ? theme.typography.body : theme.typography.cardText),
      color: theme.colors.titleText,
      height: narrow ? a.textNarrow : a.text,
      width: '100%',
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      paddingBottom: 0,
      textAlignVertical: 'top',
      outlineWidth: 0,
    }),
    count: (narrow: boolean) => ({ ...theme.typography.caption, color: theme.colors.text3, textAlign: 'right', paddingHorizontal: theme.spacing.md, marginBottom: narrow ? theme.spacing.md : theme.spacing.sm }),
    footer: (narrow: boolean) => ({ flexDirection: 'row', justifyContent: 'flex-end', gap: l.gap, marginTop: narrow ? a.footerTopNarrow : a.footerTop }),
    button: (narrow: boolean, primary: boolean, disabled: boolean, pressed: boolean) => ({
      height: narrow ? m.buttonNarrow : m.button,
      width: narrow ? undefined : primary ? a.sendWidth : l.buttonMin,
      flex: narrow ? 1 : undefined,
      alignItems: 'center', justifyContent: 'center',
      borderRadius: narrow ? m.buttonRadiusNarrow : theme.radius.block,
      backgroundColor: primary ? theme.colors.primary : theme.colors.fillButton,
      opacity: disabled ? theme.opacity.disabled : pressed ? theme.opacity.pressedPrimary : 1,
    }),
    buttonText: (narrow: boolean, primary: boolean) => ({ ...(narrow ? theme.typography.dooButtonNarrow : theme.typography.dooButton), color: primary ? theme.colors.onPrimary : theme.colors.text }),
  };
});
