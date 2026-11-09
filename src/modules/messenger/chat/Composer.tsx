import { BellOff, Code, Keyboard, Mic, Pencil, Reply, Send, Smile, Type, X } from 'lucide-react-native';
import { useEffect, useEffectEvent, useImperativeHandle, useLayoutEffect, useRef, type Ref } from 'react';
import { Text, View, type TextInputSelectionChangeEvent } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import type { Msg } from '../../../sync/api/dialog';
import {
  applyTextChange,
  composeToHtml,
  deleteBefore,
  dropLoneMention,
  emoticonHtml,
  EMPTY_COMPOSE,
  htmlToCompose,
  insertMention,
  looksLikeMarkdown,
  sameCompose,
  type ComposeValue,
  type Emoticon,
  type PickerChar,
} from '../../../sync/messenger';
import { msgPreview } from '../../../sync/messenger/preview';
import { ChatInput, useChat } from '../../../ui/chat';
import { Icon } from '../../../ui/Icon';
import { Menu, type MenuEntry } from '../../../ui/popover';
import { showToast } from '../../../ui/Toast';
import { Touchable } from '../../../ui/Touchable';
import { useSession } from '../../session';
import { useEnterSend } from '../../setting';
import { useDialog, useMessenger, useUser } from '../hooks';
import { PreviewText } from '../PreviewText';
import type { Attach } from './attach';
import type { Extra } from './extras';
import { AttachButton } from './AttachButton';
import { useComposeState, type ComposeStore } from './composeStore';
import { useEnterKey } from './enterKey';
import { inputContent } from './inputContent';
import { slashReplacement, type Candidate, type PickerKeys } from './MentionPicker';
import type { VoiceInput } from './VoiceRecorder';
import { HOLD_TO_TALK } from './voiceTraits';

/** 输入框上方的条：回复某条消息，或编辑自己发的消息 */
/** 发送方式：auto 按内容判断是否 Markdown，silence 不提醒对方 */
type SendHow = 'auto' | 'silence' | 'md' | 'normal';

export type ComposerMode = { kind: 'reply'; msg: Msg } | { kind: 'edit'; msg: Msg } | null;

export interface ComposerHandle {
  /** 在光标处插入（表情） */
  insert: (text: string) => void;
  /** 换掉输入框内容并聚焦（撤回后重新编辑） */
  replace: (value: ComposeValue) => void;
  /** 选了候选：start 为候选符号的位置，到光标为止是查询文字 */
  pick: (start: number, char: PickerChar, item: Candidate) => void;
  /** 语音转好的文字：插在光标处，切回键盘 */
  dictate: (text: string) => void;
  /** 删掉光标前的一个字（表情面板的删除键） */
  backspace: () => void;
  /** 发一个表情包或贴纸（带上正在回复的消息）；clear 时清空输入框（选了快捷表情，输入的字就是关键词） */
  sendEmoticon: (item: Emoticon, clear: boolean) => void;
}

/** 消息正文（HTML）：只有文字消息能编辑 */
const msgHtml = (msg: Msg) => String((msg.msg as { text?: unknown } | null)?.text ?? '');

/**
 * 输入栏：语音、输入框、表情面板开关，右侧有字时是发送，没字时是加号（发图片、文件）。
 * 语音模式下按住说话的长条顶替输入框（输入框留着，切回来内容和光标都在）；编辑消息时没有语音。
 * 内容放在 store 里（与上方的候选浮层共用），随时存为草稿（会话列表里显示）；
 * 编辑消息期间草稿先收起来，编辑完或取消后还原。群里回复别人时自动 @ 对方
 */
export function Composer({ dialogId, store, pickerKeysRef, mode, onModeEnd, onSent, attach, extras, voice, ref }: {
  dialogId: number;
  store: ComposeStore;
  pickerKeysRef: PickerKeys;
  attach: Attach;
  extras: Extra[];
  /** 不能录音的平台为 null */
  voice: VoiceInput | null;
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
  const userId = useSession((s) => s.user?.userid ?? 0);
  const group = useDialog(dialogId)?.type === 'group';
  const { value, selection } = useComposeState(store);
  const editing = mode?.kind === 'edit' ? mode.msg : null;
  const replyTo = mode?.kind === 'reply' ? mode.msg : null;
  const replyName = useUser(replyTo?.userid ?? 0)?.nickname;

  const saveDraft = (next: ComposeValue) => messenger?.setDraft(dialogId, next.text.trim() ? composeToHtml(next) : '');
  // place：把输入框的光标放到 cursor（程序改了文字时）；编辑消息时的内容不是草稿
  const update = (next: ComposeValue, cursor: number, place: boolean) => {
    const current = store.get();
    store.set({ value: next, cursor, selection: place ? { start: cursor, end: cursor } : current.selection });
    if (!editing) saveDraft(next);
  };
  const show = (next: ComposeValue) => store.set({ value: next, cursor: next.text.length, selection: { start: next.text.length, end: next.text.length } });

  const auto = useRef({ replyId: 0, userid: 0, done: false });

  // 编辑：进入时把草稿收起来（连着编辑别的消息时留着最初的草稿；从回复转来时去掉自动加的 @），退出时还原。
  // 要在下面的回复处理之前：从编辑转去回复时，先还原草稿再在里面 @
  const stash = useRef<ComposeValue | null>(null);
  const switchEdit = useEffectEvent(() => {
    if (editing) {
      stash.current ??= dropLoneMention(store.get().value, auto.current.userid);
      show(htmlToCompose(msgHtml(editing)));
    } else if (stash.current) {
      show(stash.current);
      saveDraft(stash.current);
      stash.current = null;
    }
  });
  useLayoutEffect(() => switchEdit(), [editing?.id]);

  // 回复：换了回复对象或取消时，上一个自动加的 @ 单独留着就去掉；群里回复别人时自动 @ 对方（已 @ 过的不重复）
  const autoMention = useEffectEvent(() => {
    const replyId = replyTo?.id ?? 0;
    if (auto.current.replyId !== replyId) {
      const current = store.get().value;
      // 转去编辑时输入框里已是消息原文（草稿那边上面已处理）
      const rest = auto.current.userid && !editing ? dropLoneMention(current, auto.current.userid) : current;
      if (rest !== current) update(rest, 0, true);
      auto.current = { replyId, userid: replyTo?.userid ?? 0, done: false };
    }
    if (!replyTo || auto.current.done || !group || replyTo.userid <= 0 || replyTo.userid === userId || !replyName) return;
    auto.current.done = true;
    const { value: current, cursor } = store.get();
    if (current.mentions.some((m) => m.char === '@' && m.id === replyTo.userid)) return;
    const result = insertMention(current, cursor, cursor, { char: '@', id: replyTo.userid, name: replyName });
    update(result.value, result.cursor, true);
  });
  useLayoutEffect(() => autoMention(), [replyTo?.id, replyName]);

  const voiceMode = !!voice?.mode && !editing;
  const leaveVoice = () => voice?.setMode(false);

  // 选了回复 / 编辑就直接能打字；语音模式下回复就按住说话
  const focusInput = useEffectEvent(() => {
    if (voiceMode) return;
    leaveVoice();
    controller.focusInput();
  });
  useEffect(() => {
    if (mode) focusInput();
  }, [mode]);

  useImperativeHandle(ref, () => ({
    insert: (piece) => {
      const { value: current, cursor } = store.get();
      const result = applyTextChange(current, current.text.slice(0, cursor) + piece + current.text.slice(cursor));
      update(result.value, cursor + piece.length, true);
    },
    replace: (next) => {
      update(next, next.text.length, true);
      leaveVoice();
      controller.focusInput();
    },
    dictate: (text) => {
      const { value: current, cursor } = store.get();
      const result = applyTextChange(current, current.text.slice(0, cursor) + text + current.text.slice(cursor));
      update(result.value, cursor + text.length, true);
      leaveVoice();
      controller.focusInput();
    },
    pick: (start, char, item) => {
      const { value: current, cursor } = store.get();
      if (char === '/') {
        const piece = slashReplacement(item);
        const result = applyTextChange(current, current.text.slice(0, start) + piece + current.text.slice(cursor));
        update(result.value, start + piece.length, true);
      } else {
        const result = insertMention(current, start, cursor, { char, id: item.id, name: item.name });
        update(result.value, result.cursor, true);
      }
      controller.focusInput();
    },
    backspace: () => {
      const { value: current, cursor } = store.get();
      const result = deleteBefore(current, cursor);
      if (result.value !== current) update(result.value, result.cursor, true);
    },
    sendEmoticon: (item, clear) => {
      if (!messenger) return;
      messenger.sendText({ dialog_id: dialogId, text: emoticonHtml(item), reply_id: replyTo?.id });
      if (clear) update(EMPTY_COMPOSE, 0, true);
      if (replyTo) onModeEnd();
      onSent();
    },
  }));

  const onChangeText = (text: string) => {
    const result = applyTextChange(store.get().value, text);
    // 整个删掉了 mention 时文字与输入框里的不同，要把光标放回去
    update(result.value, result.cursor, result.value.text !== text);
  };
  const onSelectionChange = (event: TextInputSelectionChangeEvent) => {
    store.set({ value: store.get().value, cursor: event.nativeEvent.selection.end });
  };

  const slop = { left: (theme.size.touch - theme.size.chatInput) / 2, right: (theme.size.touch - theme.size.chatInput) / 2 };
  const canSend = value.text.trim().length > 0;
  /** auto：按内容判断是否 Markdown（Enter、点按发送）；其余是长按 / 右键菜单里选的 */
  const send = (how: SendHow = 'auto') => {
    const content = store.get().value;
    if (!messenger || !content.text.trim()) return;
    if (editing) {
      if (!sameCompose({ ...content, text: content.text.trim() }, htmlToCompose(msgHtml(editing)))) {
        messenger.editText({ dialog_id: dialogId, update_id: editing.id, text: composeToHtml(content) }).catch((err: unknown) => {
          showToast(err instanceof Error && err.message ? err.message : t('messenger:chat.operationFailed'));
        });
      }
      onModeEnd();
      return;
    }
    const md = how === 'md' || (how === 'auto' && looksLikeMarkdown(content));
    messenger.sendText({ dialog_id: dialogId, text: md ? content.text.trim() : composeToHtml(content), md, reply_id: replyTo?.id, silence: how === 'silence' });
    update(EMPTY_COMPOSE, 0, true);
    onModeEnd();
    onSent();
  };

  const enterKey = useEnterKey(enterSend, () => send(), pickerKeysRef);
  const sendMenu: readonly MenuEntry[] = [
    { label: t('messenger:chat.sendSilent'), icon: BellOff, onSelect: () => send('silence') },
    { label: t('messenger:chat.sendMarkdown'), icon: Code, onSelect: () => send('md') },
    { label: t('messenger:chat.sendNormal'), icon: Type, onSelect: () => send('normal') },
  ];
  const sendIcon = <Icon icon={Send} color={canSend ? theme.colors.primaryText : theme.colors.text4} size={theme.size.icon} />;
  const emojiOpen = controller.activePanel === 'emoji';
  /** 按住说话的平台切换语音模式（收起键盘和面板 / 切回键盘）；其余平台点了直接开始录 */
  const onVoice = () => {
    if (!voice) return;
    if (!HOLD_TO_TALK) {
      voice.start();
    } else if (voice.mode) {
      voice.setMode(false);
      controller.focusInput();
    } else {
      controller.dismiss();
      voice.setMode(true);
    }
  };
  return (
    <View style={styles.root}>
      {mode && <ModeBar mode={mode} onClose={onModeEnd} />}
      <View style={styles.row}>
        {voice && !editing && (
          <Touchable
            accessibilityRole="button"
            accessibilityLabel={t(voiceMode ? 'messenger:chat.keyboard' : 'messenger:record.voice')}
            hitSlop={slop}
            onPress={onVoice}
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          >
            <Icon icon={voiceMode ? Keyboard : Mic} color={theme.colors.text2} size={theme.size.icon} />
          </Touchable>
        )}
        {voiceMode && <View style={styles.voice}>{voice?.bar}</View>}
        <View style={[styles.frame, voiceMode && styles.hidden]}>
          <ChatInput
            style={styles.input}
            {...inputContent(value)}
            selection={selection}
            onChangeText={onChangeText}
            onSelectionChange={onSelectionChange}
            multiline
            placeholder={t('messenger:chat.placeholder')}
            placeholderTextColor={theme.colors.text4}
            accessibilityLabel={t('messenger:chat.placeholder')}
            {...enterKey}
          />
        </View>
        <Touchable
          accessibilityRole="button"
          accessibilityLabel={t(emojiOpen ? 'messenger:chat.keyboard' : 'messenger:chat.emoji')}
          hitSlop={slop}
          onPress={() => {
            leaveVoice();
            controller.togglePanel('emoji');
          }}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          <Icon icon={emojiOpen ? Keyboard : Smile} color={theme.colors.text2} size={theme.size.icon} />
        </Touchable>
        {editing ? (
          // 编辑按原格式改，没有发送方式菜单
          <Touchable
            accessibilityRole="button"
            accessibilityLabel={t('messenger:chat.send')}
            disabled={!canSend}
            hitSlop={slop}
            onPress={() => send()}
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          >
            {sendIcon}
          </Touchable>
        ) : canSend && !voiceMode ? (
          <Menu
            items={sendMenu}
            trigger="context"
            button
            onPress={() => send()}
            accessibilityLabel={t('messenger:chat.send')}
            hitSlop={slop}
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          >
            {sendIcon}
          </Menu>
        ) : (
          <AttachButton attach={attach} extras={extras} hitSlop={slop} style={({ pressed }) => [styles.button, pressed && styles.pressed]} />
        )}
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
  voice: {
    flex: 1,
    marginHorizontal: theme.spacing.xs,
    marginVertical: (theme.size.touch - theme.size.chatInput) / 2,
  },
  hidden: { display: 'none' },
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
