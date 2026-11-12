import { BellOff, Code, Type } from 'lucide-react-native';
import { useEffect, useEffectEvent, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type Ref } from 'react';
import type { TextInputSelectionChangeEvent } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';

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
  type MentionSession,
  type PickerChar,
} from '../../../sync/messenger';
import { textBlocks } from '../../../sync/messenger/body';
import { useChat } from '../../../ui/chat';
import type { MenuEntry } from '../../../ui/popover';
import { showToast } from '../../../ui/Toast';
import { useSession } from '../../session';
import { useEnterSend } from '../../setting';
import { useDialog, useMessenger, useUser } from '../hooks';
import type { Attach } from './attach';
import { bubbleTones } from './bubbleTones';
import { useComposeState, type ComposeStore } from './composeStore';
import { useEnterKey } from './enterKey';
import type { Extra } from './extras';
import { slashReplacement, type Candidate, type PickerKeys } from './MentionPicker';
import type { VoiceInput } from './VoiceRecorder';
import { HOLD_TO_TALK } from './voiceTraits';

/** 发送方式：auto 按内容判断是否 Markdown，silence 不提醒对方 */
type SendHow = 'auto' | 'silence' | 'md' | 'normal';

/** 输入框上方的条：回复某条消息，或编辑自己发的消息 */
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

export interface ComposerProps {
  dialogId: number;
  store: ComposeStore;
  /** 全屏编辑里的候选；会话还没加载好时为 undefined */
  mentionSession: MentionSession | undefined;
  pickerKeysRef: PickerKeys;
  attach: Attach;
  extras: Extra[];
  /** 不能录音的平台为 null */
  voice: VoiceInput | null;
  mode: ComposerMode;
  onModeEnd: () => void;
  /** ↑ 编辑自己的上一条（Web）；有可编辑的消息时返回 true */
  onEditLast: () => boolean;
  /** 发出一条新消息后（滚到底部） */
  onSent: () => void;
  /** 搜索在线贴纸（Web 宽屏的表情浮层里） */
  onStickerSearch: () => void;
  ref?: Ref<ComposerHandle>;
}

/** 消息正文（HTML）：只有文字消息能编辑 */
const msgHtml = (msg: Msg) => String((msg.msg as { text?: unknown } | null)?.text ?? '');

/**
 * 输入栏的状态和操作（App、Web 两份界面共用）：
 * 内容放在 store 里（与上方的候选浮层共用），随时存为草稿（会话列表里显示）；
 * 编辑消息期间草稿先收起来，编辑完或取消后还原。群里回复别人时自动 @ 对方。
 * 内容多了可以展开全屏编辑（带格式）；带格式的内容在输入框里只读预览，点它、插表情、语音转文字都回到全屏编辑
 */
export function useComposer({ dialogId, store, mode, onModeEnd, onEditLast, onSent, voice, pickerKeysRef, ref }: ComposerProps) {
  const t = useT();
  const { theme } = useUnistyles();
  const messenger = useMessenger();
  const controller = useChat();
  const enterSend = useEnterSend();
  const userId = useSession((s) => s.user?.userid ?? 0);
  const server = useSession((s) => s.server);
  const dialog = useDialog(dialogId);
  const group = dialog?.type === 'group';
  const { value, selection } = useComposeState(store);
  const rich = !!value.html;
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

  const [editor, setEditor] = useState<{ value: ComposeValue; append?: string } | null>(null);
  const openEditor = (append?: string) => {
    controller.dismiss();
    setEditor({ value: store.get().value, append });
  };
  // 收起时内容交回：没有格式变回纯文本（光标放到末尾），有格式是只读预览；不再弹键盘
  const closeEditor = (next: ComposeValue) => {
    setEditor(null);
    update(next, next.text.length, !next.html);
  };

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
      const rest = auto.current.userid && !editing && !current.html ? dropLoneMention(current, auto.current.userid) : current;
      if (rest !== current) update(rest, 0, true);
      auto.current = { replyId, userid: replyTo?.userid ?? 0, done: false };
    }
    if (!replyTo || auto.current.done || !group || replyTo.userid <= 0 || replyTo.userid === userId || !replyName) return;
    auto.current.done = true;
    const { value: current, cursor } = store.get();
    // 带格式的内容只在全屏编辑里改
    if (current.html || current.mentions.some((m) => m.char === '@' && m.id === replyTo.userid)) return;
    const result = insertMention(current, cursor, cursor, { char: '@', id: replyTo.userid, name: replyName });
    update(result.value, result.cursor, true);
  });
  useLayoutEffect(() => autoMention(), [replyTo?.id, replyName]);

  const voiceMode = !!voice?.mode && !editing;
  const leaveVoice = () => voice?.setMode(false);

  // 选了回复 / 编辑就直接能打字；语音模式下回复就按住说话；带格式的内容不能在输入框里改，收起键盘
  const focusInput = useEffectEvent(() => {
    if (voiceMode) return;
    leaveVoice();
    if (store.get().value.html) controller.dismiss();
    else controller.focusInput();
  });
  useEffect(() => {
    if (mode) focusInput();
  }, [mode]);

  const insert = (piece: string) => {
    const { value: current, cursor } = store.get();
    if (current.html) return openEditor(piece);
    const result = applyTextChange(current, current.text.slice(0, cursor) + piece + current.text.slice(cursor));
    update(result.value, cursor + piece.length, true);
  };

  const sendEmoticon = (item: Emoticon, clear: boolean) => {
    if (!messenger) return;
    messenger.sendText({ dialog_id: dialogId, text: emoticonHtml(item), reply_id: replyTo?.id });
    if (clear) update(EMPTY_COMPOSE, 0, true);
    if (replyTo) onModeEnd();
    onSent();
  };

  useImperativeHandle(ref, () => ({
    insert,
    replace: (next) => {
      update(next, next.text.length, true);
      leaveVoice();
      if (next.html) controller.dismiss();
      else controller.focusInput();
    },
    dictate: (text) => {
      const { value: current, cursor } = store.get();
      if (current.html) {
        leaveVoice();
        return openEditor(text);
      }
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
      if (current.html) return;
      const result = deleteBefore(current, cursor);
      if (result.value !== current) update(result.value, result.cursor, true);
    },
    sendEmoticon,
  }));

  const onChangeText = (text: string) => {
    const result = applyTextChange(store.get().value, text);
    // 整个删掉了 mention 时文字与输入框里的不同，要把光标放回去
    update(result.value, result.cursor, result.value.text !== text);
  };
  const onSelectionChange = (event: TextInputSelectionChangeEvent) => {
    store.set({ value: store.get().value, cursor: event.nativeEvent.selection.end });
  };


  const canSend = value.text.trim().length > 0;
  /** auto：按内容判断是否 Markdown（Enter、点按发送）；其余是长按 / 右键菜单里选的 */
  const send = (how: SendHow = 'auto', content = store.get().value) => {
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

  const enterKey = useEnterKey(enterSend, () => send(), pickerKeysRef, {
    escape: () => {
      if (!mode) return false;
      onModeEnd();
      return true;
    },
    up: () => !mode && !store.get().value.text && onEditLast(),
  });
  // 带格式的内容按 HTML 发，没有 Markdown 一项
  const sendMenu: readonly MenuEntry[] = [
    { label: t('messenger:chat.sendSilent'), icon: BellOff, onSelect: () => send('silence') },
    ...(rich ? [] : [{ label: t('messenger:chat.sendMarkdown'), icon: Code, onSelect: () => send('md') }]),
    { label: t('messenger:chat.sendNormal'), icon: Type, onSelect: () => send('normal') },
  ];
  const tone = bubbleTones(theme).peer;
  const blocks = useMemo(() => (value.html ? textBlocks(value.html, false, { userId, origin: `${server}/` }) : null), [value.html, userId, server]);
  const modeTitle = editing ? t('messenger:chat.editing') : replyTo ? t('messenger:chat.replyTo', { name: replyName ?? '' }) : '';

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

  return {
    t, theme, value, selection, rich, editing, replyTo, dialog, group, userId, server,
    controller, editor, setEditor, openEditor, closeEditor, voiceMode, leaveVoice, onVoice, emojiOpen,
    insert, sendEmoticon, onChangeText, onSelectionChange, canSend, send, enterKey, sendMenu, tone, blocks, modeTitle,
  };
}
