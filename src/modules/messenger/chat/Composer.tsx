import { Keyboard, Pencil, Reply, Send, Smile, X } from 'lucide-react-native';
import { useEffect, useEffectEvent, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { Text, View, type TextInputSelectionChangeEvent } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import type { Msg } from '../../../sync/api/dialog';
import { htmlToText, textToHtml } from '../../../sync/messenger';
import { msgPreview } from '../../../sync/messenger/preview';
import { ChatInput, useChat } from '../../../ui/chat';
import { Icon } from '../../../ui/Icon';
import { showToast } from '../../../ui/Toast';
import { Touchable } from '../../../ui/Touchable';
import { useEnterSend } from '../../setting';
import { useMessenger, useUser } from '../hooks';
import { PreviewText } from '../PreviewText';
import { useEnterKey } from './enterKey';

/** 输入框上方的条：回复某条消息，或编辑自己发的消息 */
export type ComposerMode = { kind: 'reply'; msg: Msg } | { kind: 'edit'; msg: Msg } | null;

export interface ComposerHandle {
  /** 在光标处插入（表情） */
  insert: (text: string) => void;
  /** 换掉输入框内容并聚焦（撤回后重新编辑） */
  replace: (text: string) => void;
}

/** 编辑时输入框里的原文：只有文字消息能编辑，正文是 HTML */
const editableText = (msg: Msg) => htmlToText(String((msg.msg as { text?: unknown } | null)?.text ?? ''));

/**
 * 输入栏：表情面板开关、输入框、发送。
 * 输入的内容随时存为草稿（会话列表里显示）；编辑消息期间草稿先收起来，编辑完或取消后还原
 */
export function Composer({ dialogId, mode, onModeEnd, onSent, ref }: {
  dialogId: number;
  mode: ComposerMode;
  onModeEnd: () => void;
  /** 发出一条新消息后（滚到底部） */
  onSent: () => void;
  ref?: Ref<ComposerHandle>;
}) {
  const t = useT();
  const { theme } = useUnistyles();
  const messenger = useMessenger();
  const controller = useChat();
  const enterSend = useEnterSend();
  const [text, setText] = useState(() => htmlToText(messenger?.store.getState().drafts[dialogId] ?? ''));
  const selection = useRef({ start: text.length, end: text.length });
  // 进入编辑时把草稿收起来（stash），退出编辑时还原
  const editing = mode?.kind === 'edit' ? mode.msg : null;
  const [edit, setEdit] = useState<{ id: number; stash: string }>({ id: 0, stash: '' });
  if ((editing?.id ?? 0) !== edit.id) {
    if (editing) {
      setEdit({ id: editing.id, stash: edit.id ? edit.stash : text });
      setText(editableText(editing));
    } else {
      setEdit({ id: 0, stash: '' });
      setText(edit.stash);
    }
  }

  // 选了回复 / 编辑就直接能打字
  const focusInput = useEffectEvent(() => controller.focusInput());
  useEffect(() => {
    if (mode) focusInput();
  }, [mode]);

  const change = (value: string) => {
    setText(value);
    if (!editing) messenger?.setDraft(dialogId, value.trim() ? textToHtml(value) : '');
  };

  useImperativeHandle(ref, () => ({
    insert: (value) => {
      const { start, end } = selection.current;
      const next = text.slice(0, start) + value + text.slice(end);
      selection.current = { start: start + value.length, end: start + value.length };
      change(next);
    },
    replace: (value) => {
      selection.current = { start: value.length, end: value.length };
      change(value);
      controller.focusInput();
    },
  }));

  const slop = { left: (theme.size.touch - theme.size.chatInput) / 2, right: (theme.size.touch - theme.size.chatInput) / 2 };
  const canSend = text.trim().length > 0;
  const send = () => {
    if (!messenger || !canSend) return;
    if (editing) {
      const html = textToHtml(text.trim());
      if (html !== String((editing.msg as { text?: unknown } | null)?.text ?? '')) {
        messenger.editText({ dialog_id: dialogId, update_id: editing.id, text: html }).catch((err: unknown) => {
          showToast(err instanceof Error && err.message ? err.message : t('messenger:chat.operationFailed'));
        });
      }
      onModeEnd();
      return;
    }
    messenger.sendText({ dialog_id: dialogId, text: textToHtml(text.trim()), reply_id: mode?.kind === 'reply' ? mode.msg.id : undefined });
    selection.current = { start: 0, end: 0 };
    change('');
    onModeEnd();
    onSent();
  };

  const enterKey = useEnterKey(enterSend, send);
  const emojiOpen = controller.activePanel === 'emoji';
  return (
    <View style={styles.root}>
      {mode && <ModeBar mode={mode} onClose={onModeEnd} />}
      <View style={styles.row}>
        <Touchable
          accessibilityRole="button"
          accessibilityLabel={t(emojiOpen ? 'messenger:chat.keyboard' : 'messenger:chat.emoji')}
          hitSlop={slop}
          onPress={() => controller.togglePanel('emoji')}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          <Icon icon={emojiOpen ? Keyboard : Smile} color={theme.colors.text2} size={theme.size.icon} />
        </Touchable>
        <View style={styles.frame}>
          <ChatInput
            style={styles.input}
            value={text}
            onChangeText={change}
            onSelectionChange={(event: TextInputSelectionChangeEvent) => {
              selection.current = event.nativeEvent.selection;
            }}
            multiline
            placeholder={t('messenger:chat.placeholder')}
            placeholderTextColor={theme.colors.text4}
            accessibilityLabel={t('messenger:chat.placeholder')}
            {...enterKey}
          />
        </View>
        <Touchable
          accessibilityRole="button"
          accessibilityLabel={t('messenger:chat.send')}
          disabled={!canSend}
          hitSlop={slop}
          onPress={send}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          <Icon icon={Send} color={canSend ? theme.colors.primaryText : theme.colors.text4} size={theme.size.icon} />
        </Touchable>
      </View>
    </View>
  );
}

/** 回复 / 编辑条：图标、谁的哪条消息、关闭 */
function ModeBar({ mode, onClose }: { mode: NonNullable<ComposerMode>; onClose: () => void }) {
  const t = useT();
  const { theme } = useUnistyles();
  const user = useUser(mode.kind === 'reply' ? mode.msg.userid : 0);
  const preview = msgPreview(mode.msg);
  return (
    <View style={styles.bar}>
      <Icon icon={mode.kind === 'reply' ? Reply : Pencil} color={theme.colors.primaryText} size={theme.size.iconSmall} />
      <View style={styles.barText}>
        <Text style={styles.barTitle} numberOfLines={1}>
          {mode.kind === 'reply' ? t('messenger:chat.replyTo', { name: user?.nickname ?? '' }) : t('messenger:chat.editing')}
        </Text>
        {preview && (
          <Text style={styles.barPreview} numberOfLines={1}>
            <PreviewText preview={preview} />
          </Text>
        )}
      </View>
      <Touchable
        accessibilityRole="button"
        accessibilityLabel={t('messenger:chat.cancel')}
        hitSlop={theme.spacing.sm}
        onPress={onClose}
        style={({ pressed }) => [styles.barClose, pressed && styles.pressed]}
      >
        <Icon icon={X} color={theme.colors.text3} size={theme.size.iconSmall} />
      </Touchable>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: {
    backgroundColor: theme.colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.separator,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
  },
  // 按钮比触控尺寸窄，图标与输入框的间距才匀称；点按范围用 hitSlop 补回
  button: {
    width: theme.size.chatInput,
    height: theme.size.touch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: theme.opacity.pressedIcon },
  frame: {
    flex: 1,
    marginHorizontal: theme.spacing.xs,
    marginVertical: (theme.size.touch - theme.size.chatInput) / 2,
    minHeight: theme.size.chatInput,
    justifyContent: 'center',
    borderRadius: theme.radius.block,
    backgroundColor: theme.colors.fill,
  },
  input: {
    ...theme.typography.body,
    color: theme.colors.text,
    // 一行时上下内边距让框正好 chatInput 高；最多显示 8 行，超出框内滚动
    paddingVertical: (theme.size.chatInput - theme.typography.body.lineHeight) / 2,
    paddingHorizontal: theme.spacing.md,
    maxHeight: theme.typography.body.lineHeight * 8 + (theme.size.chatInput - theme.typography.body.lineHeight),
    // 输入框有底色就够了，不画浏览器自带的焦点框
    outlineStyle: 'solid',
    outlineWidth: 0,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingLeft: theme.spacing.md,
    paddingRight: theme.spacing.xs,
    paddingTop: theme.spacing.sm,
  },
  barText: { flex: 1, borderLeftWidth: 2, borderLeftColor: theme.colors.primary, paddingLeft: theme.spacing.sm },
  barTitle: { ...theme.typography.footnote, color: theme.colors.primaryText },
  barPreview: { ...theme.typography.footnote, color: theme.colors.text3 },
  barClose: { padding: theme.spacing.xs },
}));
