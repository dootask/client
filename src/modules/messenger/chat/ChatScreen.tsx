import { useLocalSearchParams } from 'expo-router';
import { AtSign, ChevronDown, Forward } from 'lucide-react-native';
import { type ComponentProps, type ReactNode, type Ref, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, BackHandler, Keyboard, Linking, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useStore } from 'zustand';

import { dateFormats, useLanguage, useT } from '../../../i18n';
import type { Msg } from '../../../sync/api/dialog';
import { atLatest, composerBlock, hasEarlier, htmlToCompose, type Emoticon, type WithdrawnMsg } from '../../../sync/messenger';
import type { MsgBody } from '../../../sync/messenger/body';
import { ChatView, type ChatViewHandle, type MessageRenderInfo, type ScrollToBottomInfo } from '../../../ui/chat';
import { Icon } from '../../../ui/Icon';
import { showToast } from '../../../ui/Toast';
import { Touchable } from '../../../ui/Touchable';
import { useErrorText, useSession } from '../../session';
import { useToday } from '../clock';
import { useDialog, useMessenger, useMessengerState, useMsgActions } from '../hooks';
import { ChatBanners } from './ChatBanners';
import { ChatHeader } from './ChatHeader';
import type { RowRef } from './bubbleTouchTypes';
import { useAttach } from './attach';
import { ChatDropZone } from './ChatDropZone';
import { buildRows, type RowData } from './chatModel';
import { Composer, type ComposerHandle, type ComposerMode } from './Composer';
import { useComposeStore } from './composeStore';
import { EmojiPanel } from './EmojiPanel';
import { type ExtraSheet, useExtras } from './extras';
import { QuickEmoticons } from './QuickEmoticons';
import { countText, dayLabel } from './format';
import { MessageActionMenu, type LongPressTarget } from './MessageActionMenu';
import { MentionAccessory, type PickerKeys } from './MentionPicker';
import { forwardable, type MenuHandlers, useMessageMenus } from './messageMenu';
import { bubbleTones, MessageRow, RowContextValue, type RowContext } from './MessageRow';
import { MorePanel } from './MorePanel';
import { RichHandlersContext, type RichHandlers } from './RichText';
import { createSelection, SELECTION_MAX, type Selection } from './selection';
import { SendPreview } from './SendPreview';
import { AnonSheet } from './sheets/AnonSheet';
import { FavoriteRemarkSheet } from './sheets/FavoriteRemarkSheet';
import { ForwardSheet } from './sheets/ForwardSheet';
import { ReadListSheet } from './sheets/ReadListSheet';
import { SelectTextSheet } from './sheets/SelectTextSheet';
import { StickerSearchSheet } from './sheets/StickerSearchSheet';
import { TodoDetailSheet } from './sheets/TodoDetailSheet';
import { TodoSetSheet } from './sheets/TodoSetSheet';
import { TranslateSheet } from './sheets/TranslateSheet';
import { VoteSheet } from './sheets/VoteSheet';
import { WordChainSheet } from './sheets/WordChainSheet';
import { toggleVoice } from './voice';
import { useVoiceInput } from './VoiceRecorder';
import { CAN_RECORD } from './voiceTraits';

/** 离开会话时最上面看到的那条，下次打开回到这里（本次运行内） */
const positions = new Map<number, number>();

/** 定位迟迟找不到目标（消息已删除等）时，最多等这么久就显示列表 */
const LOCATE_TIMEOUT = 3000;

/** 第一条未读贴顶时，上方再露出几条 */
const UNREAD_ABOVE = 2;

const renderMessage = (info: MessageRenderInfo<RowData>) => <MessageRow info={info} />;

/** 聊天页上弹出的弹层（一次只开一个） */
type SheetContent =
  | { kind: 'forward'; msgIds: number[] }
  | { kind: 'todoSet' | 'todoDetail' | 'translate'; msg: Msg }
  | { kind: 'remark' | 'readList'; msgId: number }
  | { kind: 'selectText'; text: string }
  | { kind: 'stickerSearch' }
  | ExtraSheet;
/** seq：每次打开换一个，弹层重新挂载、状态从头开始；visible 置 false 时内容留着放完关闭动画 */
type SheetState = { seq: number; visible: boolean; content: SheetContent };

/** 路由页：/messenger/[dialogId]?msg=消息 id（从搜索、回复跳过来时定位到这条） */
export function ChatRoute() {
  const params = useLocalSearchParams<{ dialogId: string; msg?: string }>();
  const dialogId = Number(params.dialogId) || 0;
  // 换会话时整页重建：输入栏草稿、定位、已读快照都按会话来
  return <ChatScreen key={dialogId} dialogId={dialogId} msgId={Number(params.msg) || 0} />;
}

/**
 * 聊天页：打开时依次定位到指定消息、第一条未读、上次看的位置，都没有就在底部；定位好之前列表不显示。
 * 看到的消息上报已读；有 @ 我的未读时右下角可以逐条跳过去
 */
function ChatScreen({ dialogId, msgId }: { dialogId: number; msgId: number }) {
  const t = useT();
  const { theme } = useUnistyles();
  const messenger = useMessenger();
  const errorText = useErrorText();
  const userId = useSession((s) => s.user?.userid ?? 0);
  const isAdmin = useSession((s) => s.user?.identity.includes('admin') ?? false);
  const server = useSession((s) => s.server);
  /** 服务器根地址（带结尾的 /）：消息里的相对地址、表情包图片按它拼 */
  const origin = `${server}/`;
  const dialog = useDialog(dialogId);
  const block = dialog ? composerBlock(dialog, isAdmin) : null;
  const canSend = block == null;
  const win = useMessengerState((s) => s.windows[dialogId]);
  const outbox = useMessengerState((s) => s.outbox);
  const uploads = useMessengerState((s) => s.uploads);
  const withdrawn = useMessengerState((s) => s.withdrawn);
  const sentKeys = useMessengerState((s) => s.sentKeys);
  const chatRef = useRef<ChatViewHandle>(null);
  const composerRef = useRef<ComposerHandle>(null);
  // 输入栏内容：从草稿开始，输入栏和上方的候选浮层共用
  const compose = useComposeStore(() => htmlToCompose(messenger?.store.getState().drafts[dialogId] ?? ''));
  const pickerKeysRef: PickerKeys = useRef(null);

  // 打开时的未读快照：上报已读会把会话上的这两项清掉
  const [opening] = useState(() => ({ unreadOne: dialog?.unread_one ?? 0, mentions: dialog?.mention_ids ?? [] }));
  const [mentions, setMentions] = useState<readonly number[]>(opening.mentions);
  const [located, setLocated] = useState(false);
  const [mode, setMode] = useState<ComposerMode>(null);
  const menuHost = useRef<MenuHostHandle>(null);
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [selection] = useState(createSelection);
  const actions = useMsgActions();
  const mentionSession = useMemo(() => actions?.mentionSession(dialogId, userId), [actions, dialogId, userId]);

  const list = win?.list;
  const rows = useMemo(
    () => buildRows({ list: list ?? [], outbox, uploads, withdrawn, sentKeys, dialogId, userId }),
    [list, outbox, uploads, withdrawn, sentKeys, dialogId, userId],
  );
  const byId = useMemo(() => new Map((list ?? []).map((m) => [String(m.id), m])), [list]);

  // 打开、关闭会话；定位
  useEffect(() => {
    if (!messenger || !dialogId) return;
    let cancelled = false;
    const target = msgId || opening.unreadOne || positions.get(dialogId) || 0;
    const opened = messenger.openDialog(dialogId).catch((err) => showToast(errorText(err)));
    const locate = async () => {
      await opened;
      if (cancelled) return;
      if (target) {
        await messenger.loadAround(dialogId, target).catch(() => {});
        if (cancelled) return;
        const scrolled = chatRef.current?.scrollToMessage(String(target), {
          animated: false,
          highlight: !!msgId,
          above: msgId ? undefined : target === opening.unreadOne ? UNREAD_ABOVE : 0,
        });
        await Promise.race([scrolled, new Promise((resolve) => setTimeout(resolve, LOCATE_TIMEOUT))]);
      }
      if (!cancelled) setLocated(true);
    };
    void locate();
    return () => {
      cancelled = true;
      messenger.closeDialog(dialogId);
    };
  }, [messenger, dialogId, msgId, opening, errorText]);

  // 没有定位目标时，有缓存就先显示，不等最新一页
  if (!located && !msgId && !opening.unreadOne && !positions.has(dialogId) && list && list.length > 0) setLocated(true);

  // 看到的消息：上报已读、划掉看到的 @ 我、记下最上面那条（下次打开回到这里）。
  // 定位好之前列表停在底部，那时「看到」的不算
  const visible = useRef<string[]>([]);
  const reportRead = useCallback(() => {
    if (!messenger || AppState.currentState !== 'active') return;
    for (const id of visible.current) {
      const msg = byId.get(id);
      if (msg && !msg.read_at && msg.userid !== userId) messenger.markRead(msg);
    }
  }, [messenger, byId, userId]);
  const seen = useCallback(() => {
    if (!located) return;
    const ids = visible.current;
    const numeric = ids.map(Number).filter((id) => id > 0);
    const newest = rows[0];
    if (newest && ids.includes(newest.id)) positions.delete(dialogId);
    else if (numeric.length) positions.set(dialogId, Math.min(...numeric));
    setMentions((prev) => (prev.some((id) => ids.includes(String(id))) ? prev.filter((id) => !ids.includes(String(id))) : prev));
    reportRead();
  }, [located, rows, dialogId, reportRead]);
  const onVisibleChange = useCallback((ids: string[]) => {
    visible.current = ids;
    seen();
  }, [seen]);
  // 可视区没变但内容变了（新消息进来、定位刚完成）也要再看一遍
  useEffect(seen);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') reportRead();
    });
    return () => sub.remove();
  }, [reportRead]);

  const jumpTo = useCallback(async (id: number, highlight = true) => {
    if (!messenger) return;
    await messenger.loadAround(dialogId, id).catch((err) => showToast(errorText(err)));
    await chatRef.current?.scrollToMessage(String(id), { highlight });
  }, [messenger, dialogId, errorText]);

  const onJump = useCallback((id: number) => void jumpTo(id), [jumpTo]);

  const openSheet = useCallback((content: SheetContent) => {
    Keyboard.dismiss();
    setSheet((prev) => ({ seq: (prev?.seq ?? 0) + 1, visible: true, content }));
  }, []);
  const closeSheet = useCallback(() => setSheet((prev) => prev && { ...prev, visible: false }), []);

  const onReply = useCallback((msg: Msg) => {
    setMode({ kind: 'reply', msg });
  }, []);
  // useMessageMenus 只在选中菜单项时读取，不要求稳定
  const handlers: MenuHandlers = {
    onReply: canSend ? onReply : undefined,
    onEdit: canSend ? (msg: Msg) => setMode({ kind: 'edit', msg }) : undefined,
    onForward: (msg: Msg) => openSheet({ kind: 'forward', msgIds: [msg.id] }),
    onSelectMany: (msg: Msg) => {
      Keyboard.dismiss();
      selection.start(msg.id);
    },
    onSelectText: (text: string) => openSheet({ kind: 'selectText', text }),
    onSetTodo: (msg: Msg) => openSheet({ kind: 'todoSet', msg }),
    onTodoDetail: (msg: Msg) => openSheet({ kind: 'todoDetail', msg }),
    onFavoriteRemark: (msgId: number) => openSheet({ kind: 'remark', msgId }),
  };
  const { menu, pendingMenu, uploadMenu } = useMessageMenus(handlers);

  // 多选：Shift 连选按显示顺序（从旧到新）取可转发的消息
  const selectable = useRef<number[]>([]);
  useEffect(() => {
    selectable.current = rows.flatMap((row) => (row.data.kind === 'msg' && forwardable(row.data.msg) ? [row.data.msg.id] : [])).reverse();
  }, [rows]);

  const onReact = useCallback((msg: Msg, symbol: string) => {
    messenger?.toggleEmoji(msg, symbol).catch((err) => showToast(errorText(err)));
  }, [messenger, errorText]);

  const rowContext = useMemo<RowContext>(() => ({
    group: dialog?.type === 'group',
    body: { userId, origin },
    tones: bubbleTones(theme.colors),
    newFrom: opening.unreadOne,
    menu,
    pendingMenu,
    uploadMenu,
    onOpen: (msg: Msg, body: MsgBody) => {
      if (body.kind === 'record') {
        void toggleVoice(body.url);
        messenger?.clearDot(msg);
      } else if (body.kind === 'image' || body.kind === 'video' || body.kind === 'file') {
        void Linking.openURL(body.url).catch(() => {});
      }
    },
    onReact,
    onQuote: (id: number) => void jumpTo(id),
    onLongPress: (row: RowRef, info: MessageRenderInfo<RowData>, msg: Msg, body: MsgBody) => {
      row.measureInWindow((x, y, width, height) => menuHost.current?.open({ anchor: { x, y, width, height }, info, msg, body }));
    },
    onReply: canSend ? onReply : undefined,
    onHover: (msg: Msg) => {
      if (actions && !(msg.id in (messenger?.store.getState().favorites ?? {}))) actions.checkFavorite(msg.id).catch(() => {});
    },
    onTranslation: (msg: Msg) => openSheet({ kind: 'translate', msg }),
    onReadList: (msgId: number) => openSheet({ kind: 'readList', msgId }),
    selection: selection.store,
    onSelect: (msg: Msg, extend: boolean) => {
      const ok = extend ? selection.extend(msg.id, selectable.current) : selection.toggle(msg.id);
      if (!ok) showToast(t('messenger:selection.max', { n: SELECTION_MAX }));
    },
    onReEdit: canSend
      ? (item: WithdrawnMsg) => {
          composerRef.current?.replace(item.md ? { text: item.text, mentions: [] } : htmlToCompose(item.text));
          messenger?.forgetWithdrawn(item.id);
        }
      : undefined,
  }), [canSend, dialog?.type, userId, origin, theme.colors, opening.unreadOne, menu, pendingMenu, uploadMenu, messenger, actions, onReact, jumpTo, onReply, openSheet, selection, t]);

  const richHandlers = useMemo<RichHandlers>(() => ({
    onPressRun: (run) => {
      if (run.href) void Linking.openURL(run.href).catch(() => {});
    },
    onPressImage: (block) => {
      if (block.url) void Linking.openURL(block.url).catch(() => {});
    },
  }), []);

  const language = useLanguage();
  const today = useToday();
  const renderDay = useCallback((createdAt: number) => <Text style={styles.day}>{dayLabel(createdAt, today, t, dateFormats(language))}</Text>, [today, t, language]);
  const renderScrollToBottom = useCallback((info: ScrollToBottomInfo) => <ScrollToBottom newCount={info.newCount} />, []);

  const loading = win?.loading ?? null;
  const onLoadEarlier = useCallback(() => void messenger?.loadEarlier(dialogId).catch((err) => showToast(errorText(err))), [messenger, dialogId, errorText]);
  const onLoadNewer = useCallback(() => void messenger?.loadNewer(dialogId).catch((err) => showToast(errorText(err))), [messenger, dialogId, errorText]);
  const onJumpToLatest = useCallback(async () => {
    await messenger?.loadLatest(dialogId).catch((err) => showToast(errorText(err)));
  }, [messenger, dialogId, errorText]);
  const onSent = useCallback(() => chatRef.current?.scrollToBottom(), []);
  const onModeEnd = useCallback(() => setMode(null), []);
  // ↑ 编辑上一条：自己最新的一条已发出的文字消息（列表从新到旧）
  const onEditLast = () => {
    const last = rows.find((row) => row.data.kind === 'msg' && row.data.msg.userid === userId && row.data.msg.type === 'text');
    if (last?.data.kind !== 'msg') return false;
    setMode({ kind: 'edit', msg: last.data.msg });
    return true;
  };
  const attach = useAttach({ dialogId, mode, onModeEnd, onSent });
  const onConverted = useCallback((text: string) => composerRef.current?.dictate(text), []);
  const voice = useVoiceInput({ dialogId, mode, onModeEnd, onSent, onConverted });
  const extras = useExtras({ dialog, userId, openSheet });

  const nextMention = mentions.length ? Math.min(...mentions) : 0;
  // 面板一直挂着：元素要稳定，否则页面每次重渲染（如开始、结束录音）都连带重渲染整个表情面板
  const emojiPanel = useMemo(() => (
    <EmojiPanel
      origin={origin}
      onInsert={(emoji) => composerRef.current?.insert(emoji)}
      onDelete={() => composerRef.current?.backspace()}
      onSend={(item) => composerRef.current?.sendEmoticon(item, false)}
      onSearch={() => openSheet({ kind: 'stickerSearch' })}
    />
  ), [origin, openSheet]);
  // 传给列表的元素要稳定，每次新建会让整个消息列表跟着重渲染
  const loadingIndicator = useMemo(() => <ActivityIndicator color={theme.colors.text3} />, [theme.colors.text3]);

  return (
    <View style={styles.root}>
      <RowContextValue.Provider value={rowContext}>
        <RichHandlersContext.Provider value={richHandlers}>
          <ChatDropZone onFiles={attach.offer} disabled={!canSend}>
            <ChatView
              ref={chatRef}
              messages={rows}
              currentUserId={String(userId)}
              renderMessage={renderMessage}
              renderDay={renderDay}
              header={
                <>
                  <ChatHeader dialogId={dialogId} dialog={dialog} />
                  <ChatBanners dialog={dialog} onJump={onJump} />
                </>
              }
              composer={
                <BottomBar selection={selection} onForward={(msgIds) => openSheet({ kind: 'forward', msgIds })}>
                  {block ? (
                    <ComposerNotice text={t(block === 'muted' ? 'messenger:chat.muted' : 'messenger:chat.disabled')} />
                  ) : (
                    <Composer ref={composerRef} dialogId={dialogId} store={compose} pickerKeysRef={pickerKeysRef} mentionSession={mentionSession} mode={mode} onModeEnd={onModeEnd} onEditLast={onEditLast} onSent={onSent} attach={attach} extras={extras} voice={CAN_RECORD ? voice : null} />
                  )}
                </BottomBar>
              }
              bottomColor={theme.colors.surface}
              accessory={
                <>
                  {/* 录音浮层出现时只藏起来不卸载：重新挂载在 Android 上要卡一下，松手后浮层会晚收起 */}
                  <View style={voice.hud != null && styles.hidden}>
                    {mentionSession && (
                      <MentionAccessory
                        store={compose}
                        dialog={dialog}
                        session={mentionSession}
                        userId={userId}
                        keysRef={pickerKeysRef}
                        onPick={(start, char, item) => composerRef.current?.pick(start, char, item)}
                      />
                    )}
                    <QuickEmoticons store={compose} origin={origin} enabled={mode?.kind !== 'edit' && !voice.mode} onPick={(item) => composerRef.current?.sendEmoticon(item, true)} />
                  </View>
                  {voice.hud}
                </>
              }
              panels={{
                emoji: emojiPanel,
                more: <MorePanel attach={attach} extras={extras} />,
              }}
              keyboardDragOffset={theme.size.touch + theme.spacing.xs * 2}
              renderScrollToBottom={renderScrollToBottom}
              floating={nextMention > 0 && <MentionJump count={mentions.length} onPress={() => void jumpTo(nextMention)} />}
              onVisibleChange={onVisibleChange}
              highlightColor={theme.colors.rowHighlight}
              listHidden={!located}
              loadingIndicator={loadingIndicator}
              emptyContent={win?.synced ? <Text style={styles.empty}>{t('messenger:chat.empty')}</Text> : <ActivityIndicator color={theme.colors.text3} />}
              hasEarlier={!!win?.synced && hasEarlier(win.list)}
              loadingEarlier={loading === 'earlier'}
              onLoadEarlier={onLoadEarlier}
              hasNewer={!!list && !atLatest(list)}
              loadingNewer={loading === 'newer'}
              onLoadNewer={onLoadNewer}
              onJumpToLatest={onJumpToLatest}
            />
          </ChatDropZone>
        </RichHandlersContext.Provider>
        <MenuHost ref={menuHost} group={dialog?.type === 'group'} userId={userId} menu={menu} onReact={onReact} />
      </RowContextValue.Provider>
      {attach.preview && <SendPreview {...attach.preview} onClose={attach.closePreview} onSend={attach.send} />}
      {sheet && <ChatSheet key={sheet.seq} dialogId={dialogId} content={sheet.content} visible={sheet.visible} onClose={closeSheet} onForwarded={selection.clear} onSent={onSent} onPickSticker={(item) => composerRef.current?.sendEmoticon(item, false)} />}
    </View>
  );
}

type MenuHostHandle = { open: (target: LongPressTarget) => void };

/**
 * 长按菜单单独持有状态：长按时只渲染这一小块，不连带整个聊天页。
 * 整页重渲染在安卓上会被按住期间不断到来的触摸事件反复打断，菜单要等松手才出来
 */
function MenuHost({ ref, ...props }: Omit<ComponentProps<typeof MessageActionMenu>, 'target' | 'onClose'> & { ref: Ref<MenuHostHandle> }) {
  const [target, setTarget] = useState<LongPressTarget | null>(null);
  useImperativeHandle(ref, () => ({ open: setTarget }), []);
  return target && <MessageActionMenu {...props} target={target} onClose={() => setTarget(null)} />;
}

function ChatSheet({ dialogId, content, visible, onClose, onForwarded, onSent, onPickSticker }: {
  dialogId: number;
  content: SheetContent;
  visible: boolean;
  onClose: () => void;
  onForwarded: () => void;
  /** 投票、接龙发出后（滚到底部） */
  onSent: () => void;
  onPickSticker: (item: Emoticon) => void;
}) {
  const common = { visible, onClose };
  switch (content.kind) {
    case 'forward':
      return <ForwardSheet {...common} msgIds={content.msgIds} onSent={onForwarded} />;
    case 'todoSet':
      return <TodoSetSheet {...common} msg={content.msg} />;
    case 'todoDetail':
      return <TodoDetailSheet {...common} msg={content.msg} />;
    case 'translate':
      return <TranslateSheet {...common} msg={content.msg} />;
    case 'remark':
      return <FavoriteRemarkSheet {...common} msgId={content.msgId} />;
    case 'readList':
      return <ReadListSheet {...common} msgId={content.msgId} />;
    case 'selectText':
      return <SelectTextSheet {...common} text={content.text} />;
    case 'stickerSearch':
      return <StickerSearchSheet {...common} onPick={onPickSticker} />;
    case 'vote':
      return <VoteSheet {...common} dialogId={dialogId} onSent={onSent} />;
    case 'wordChain':
      return <WordChainSheet {...common} dialogId={dialogId} onSent={onSent} />;
    case 'anon':
      return <AnonSheet {...common} userid={content.userid} />;
  }
}

/**
 * 输入栏位置：多选时换成「取消 · 已选 n 项 · 转发」。输入栏只是藏起来，草稿、回复状态都还在。
 * 多选时系统返回键先退出多选
 */
function BottomBar({ selection, onForward, children }: { selection: Selection; onForward: (msgIds: number[]) => void; children: ReactNode }) {
  const t = useT();
  const { theme } = useUnistyles();
  const active = useStore(selection.store, (s) => s.active);
  const ids = useStore(selection.store, (s) => s.ids);

  useEffect(() => {
    if (!active) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      selection.clear();
      return true;
    });
    return () => sub.remove();
  }, [active, selection]);

  return (
    <>
      {active && (
        <View style={styles.selectBar}>
          <Touchable accessibilityRole="button" onPress={selection.clear} style={({ pressed, hovered }) => styles.barButton(pressed, hovered)}>
            <Text style={styles.barCancel}>{t('cancel')}</Text>
          </Touchable>
          <Text style={styles.barCount}>{t('messenger:selection.count', { n: ids.size })}</Text>
          <Touchable
            accessibilityRole="button"
            disabled={ids.size === 0}
            onPress={() => onForward([...ids].sort((a, b) => a - b))}
            style={({ pressed, hovered }) => styles.barButton(pressed, hovered)}
          >
            <Icon icon={Forward} color={ids.size ? theme.colors.primaryText : theme.colors.text4} size={theme.size.icon} />
            <Text style={styles.barForward(ids.size > 0)}>{t('messenger:action.forward')}</Text>
          </Touchable>
        </View>
      )}
      <View style={active && styles.hidden}>{children}</View>
    </>
  );
}

/** D15 不能发言时代替输入区：与输入框同高同底色，居中一行说明 */
function ComposerNotice({ text }: { text: string }) {
  return (
    <View style={styles.notice}>
      <View style={styles.noticeBody}>
        <Text style={styles.noticeText} numberOfLines={1}>{text}</Text>
      </View>
    </View>
  );
}

/** 回到底部：离开底部后新到的消息数 */
function ScrollToBottom({ newCount }: { newCount: number }) {
  const t = useT();
  const { theme } = useUnistyles();
  return (
    <View style={styles.float} accessibilityRole="button" accessibilityLabel={t('messenger:chat.toBottom')}>
      <Icon icon={ChevronDown} color={theme.colors.text2} size={theme.size.icon} />
      {newCount > 0 && (
        <View style={styles.floatBadge}>
          <Text style={styles.floatBadgeText} allowFontScaling={false}>{countText(newCount)}</Text>
        </View>
      )}
    </View>
  );
}

/** 跳到 @ 我的消息：每点一次跳下一条，看到的就不算了 */
function MentionJump({ count, onPress }: { count: number; onPress: () => void }) {
  const t = useT();
  const { theme } = useUnistyles();
  return (
    <Touchable accessibilityRole="button" accessibilityLabel={t('messenger:chat.mentionMe')} onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <View style={styles.float}>
        <Icon icon={AtSign} color={theme.colors.primaryText} size={theme.size.icon} />
        {count > 1 && (
          <View style={styles.floatBadge}>
            <Text style={styles.floatBadgeText} allowFontScaling={false}>{countText(count)}</Text>
          </View>
        )}
      </View>
    </Touchable>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  day: {
    ...theme.typography.caption,
    color: theme.colors.text3,
    textAlign: 'center',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xs,
  },
  empty: { ...theme.typography.subhead, color: theme.colors.text3 },
  hidden: { display: 'none' },
  selectBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: theme.size.navBar,
    paddingHorizontal: theme.spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.separator,
    backgroundColor: theme.colors.surface,
  },
  barButton: (pressed: boolean, hovered: boolean) => ({
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    minHeight: theme.size.touch,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.block,
    opacity: pressed ? theme.opacity.pressedIcon : 1,
    backgroundColor: hovered ? theme.colors.hover : 'transparent',
  }),
  barCancel: { ...theme.typography.callout, color: theme.colors.text2 },
  barCount: { ...theme.typography.callout, color: theme.colors.text, fontVariant: ['tabular-nums'] },
  barForward: (enabled: boolean) => ({ ...theme.typography.callout, fontWeight: '600', color: enabled ? theme.colors.primaryText : theme.colors.text4 }),
  pressed: { opacity: theme.opacity.pressedIcon },
  notice: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs + (theme.size.touch - theme.size.chatInput) / 2,
    backgroundColor: theme.colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.separator,
  },
  noticeBody: {
    minHeight: theme.size.chatInput,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.block,
    backgroundColor: theme.colors.fill,
  },
  noticeText: { ...theme.typography.subhead, color: theme.colors.text3 },
  float: {
    width: theme.size.floatButton,
    height: theme.size.floatButton,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    boxShadow: theme.shadow.float,
  },
  floatBadge: {
    position: 'absolute',
    top: -theme.spacing.xs - 2,
    minWidth: theme.spacing.xl,
    paddingHorizontal: theme.spacing.xs,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
  },
  floatBadgeText: { ...theme.typography.caption2, color: theme.colors.onPrimary, fontVariant: ['tabular-nums'] },
}));
