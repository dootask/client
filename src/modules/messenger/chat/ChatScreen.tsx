import { router, useLocalSearchParams, usePathname } from 'expo-router';
import { AtSign, ChevronDown } from 'lucide-react-native';
import { type ComponentProps, type ReactNode, type Ref, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, BackHandler, Keyboard, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useStore } from 'zustand';

import { dateFormats, useLanguage, useT } from '../../../i18n';
import type { Msg } from '../../../sync/api/dialog';
import { atLatest, composerBlock, hasEarlier, htmlToCompose, isAiBotDialog, type Emoticon, type WithdrawnMsg } from '../../../sync/messenger';
import { msgContent, type MsgBody, type Reaction } from '../../../sync/messenger/body';
import { ChatView, type ChatViewHandle, type MessageRenderInfo, type ScrollToBottomInfo } from '../../../ui/chat';
import { Icon } from '../../../ui/Icon';
import { SidePage, useSplitView } from '../../../ui/layout';
import { useShortcut } from '../../../ui/shortcuts';
import { showToast } from '../../../ui/Toast';
import { Touchable } from '../../../ui/Touchable';
import { openMedia } from '../../media';
import { useErrorText, useSession } from '../../session';
import { useToday } from '../clock';
import { useDialog, useMessenger, useMessengerState, useMsgActions } from '../hooks';
import { ChatTopBar } from './ChatTopBar';
import type { RowRef } from './bubbleTouchTypes';
import { useAttach } from './attach';
import { ChatDropZone } from './ChatDropZone';
import { buildRows, type RowData } from './chatModel';
import { Composer, type ComposerHandle, type ComposerMode } from './Composer';
import { useComposeStore } from './composeStore';
import { useReturnTab } from './useReturnTab';
import { EmojiPanel } from './EmojiPanel';
import { type ExtraSheet, useExtras } from './extras';
import { QuickEmoticons } from './QuickEmoticons';
import { QuickMsgBar } from './QuickMsgBar';
import { AiComposeModal } from './AiComposeModal';
import { useAiModels } from './useAiModels';
import { countText, dayLabel } from './format';
import { MessageActionMenu, type LongPressTarget } from './MessageActionMenu';
import { MentionAccessory, type PickerKeys } from './MentionPicker';
import { forwardable, type MenuHandlers, useMessageMenus } from './messageMenu';
import { openGallery } from './gallery';
import { MessageRow } from './MessageRow';
import { openMsgFile } from './fileActions';
import { pushMerge } from './MergeScreen';
import { mergeTitleText } from './cards/cardModel';
import { bubbleTones } from './bubbleTones';
import { MyTodosContext, RowContextValue, type RowContext } from './rowParts';
import { rowTraits } from './rowTraits';
import { MorePanel, morePanelHeight } from './MorePanel';
import { openLocation } from './openLocation';
import { useOpenHref } from './openHref';
import { RichHandlersContext, type RichHandlers } from './RichText';
import { useSelectDrag } from './selectDrag';
import { createSelection, SELECTION_MAX, type Selection } from './selection';
import { SelectionBar } from './SelectionBar';
import { SendPreview } from './SendPreview';
import { AnonSheet } from './sheets/AnonSheet';
import { FavoriteRemarkSheet } from './sheets/FavoriteRemarkSheet';
import { ForwardSheet } from './sheets/ForwardSheet';
import { MergeDetailSheet } from './sheets/MergeDetailSheet';
import { ReactionListSheet } from './sheets/ReactionListSheet';
import { ReadListSheet } from './sheets/ReadListSheet';
import { SelectTextSheet } from './sheets/SelectTextSheet';
import { StickerSearchSheet } from './sheets/StickerSearchSheet';
import { TodoDetailSheet } from './sheets/TodoDetailSheet';
import { TodoSetSheet } from './sheets/TodoSetSheet';
import { TranslateSheet } from './sheets/TranslateSheet';
import { VoteSheet } from './sheets/VoteSheet';
import { WordChainSheet } from './sheets/WordChainSheet';
import { openLongText } from './longText';
import { toggleVoice } from './voice';
import { useVoiceInput } from './VoiceRecorder';
import { AUTO_NEXT, CAN_RECORD } from './voiceTraits';

/** 离开会话时最上面看到的那条，下次打开回到这里（本次运行内） */
const positions = new Map<number, number>();

/** 定位迟迟找不到目标（消息已删除等）时，最多等这么久就显示列表 */
const LOCATE_TIMEOUT = 3000;

/** 第一条未读贴顶时，上方再露出几条 */
const UNREAD_ABOVE = 2;

/** 筛选时不显示发送中、撤回占位 */
const NONE: never[] = [];

const renderMessage = (info: MessageRenderInfo<RowData>) => <MessageRow info={info} />;

/** 聊天页上弹出的弹层（一次只开一个） */
type SheetContent =
  | { kind: 'forward'; msgIds: number[]; multi?: boolean; defaultMerge?: boolean }
  | { kind: 'todoSet' | 'todoDetail' | 'translate'; msg: Msg }
  | { kind: 'remark' | 'readList'; msgId: number }
  | { kind: 'selectText'; text: string }
  | { kind: 'reactions'; reactions: readonly Reaction[]; symbol: string }
  | { kind: 'stickerSearch' }
  /** 参与接龙（接龙结果） */
  | { kind: 'wordChainJoin'; msg: Msg }
  | { kind: 'merge'; msgId: number; title: string }
  | ExtraSheet;
/** seq：每次打开换一个，弹层重新挂载、状态从头开始；visible 置 false 时内容留着放完关闭动画 */
type SheetState = { seq: number; visible: boolean; content: SheetContent };

/** at 每次改变，让同一条消息可以重复定位 */
export function ChatRoute() {
  const params = useLocalSearchParams<{ dialogId: string; msg?: string; at?: string; reply?: string; from?: string }>();
  const dialogId = Number(params.dialogId) || 0;
  const split = useSplitView();
  useReturnTab(params.from, !split);
  const pathname = usePathname();
  // 退回栈底的列表（navigate 会在聊天页上再压一层，聊天页不卸载、会话一直算开着）
  useShortcut('escape', () => router.dismissTo('/messenger'), { enabled: split && pathname === `/messenger/${dialogId}`, inInput: true });
  // 换会话时整页重建：输入栏草稿、定位、已读快照都按会话来
  return <ChatScreen key={dialogId} dialogId={dialogId} msgId={Number(params.msg) || 0} threadId={0} locateAt={params.at} reply={params.reply === '1'} />;
}

/** 打开回复线程：/messenger/thread/[msgId]?dialogId=会话 id */
const pushThread = (msg: Msg) => router.push({ pathname: '/messenger/thread/[msgId]', params: { msgId: msg.id, dialogId: msg.dialog_id } });

/** 回复线程页（F7，旧版网页「回复消息」）：上面是被回复的那条和它的回复，输入栏发出的都回复这条 */
export function ThreadRoute() {
  const t = useT();
  const params = useLocalSearchParams<{ msgId: string; dialogId: string }>();
  const msgId = Number(params.msgId) || 0;
  const dialogId = Number(params.dialogId) || 0;
  const close = () => (router.canGoBack() ? router.back() : router.navigate(`/messenger/${dialogId}`));
  return (
    <SidePage title={t('messenger:thread.title')} onClose={close} drawer>
      <ChatScreen key={msgId} dialogId={dialogId} msgId={0} threadId={msgId} reply={false} />
    </SidePage>
  );
}

/**
 * 聊天页：打开时依次定位到指定消息、第一条未读、上次看的位置，都没有就在底部；定位好之前列表不显示。
 * 看到的消息上报已读；有 @ 我的未读时右下角可以逐条跳过去。
 * threadId 不为 0 时是回复线程：只显示这条和它的回复，不开关会话、不记位置、不存草稿
 */
function ChatScreen({ dialogId, msgId, threadId, locateAt, reply }: { dialogId: number; msgId: number; threadId: number; locateAt?: string; reply: boolean }) {
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
  const aiModels = useAiModels();
  const aiBot = !!dialog && isAiBotDialog(dialog);
  const [aiCompose, setAiCompose] = useState(false);
  const openAi = useCallback(() => { Keyboard.dismiss(); setAiCompose(true); }, [setAiCompose]);
  const block = dialog ? composerBlock(dialog, isAdmin) : null;
  const canSend = block == null;
  const win = useMessengerState((s) => s.windows[dialogId]);
  const outbox = useMessengerState((s) => s.outbox);
  const uploads = useMessengerState((s) => s.uploads);
  const withdrawn = useMessengerState((s) => s.withdrawn);
  const sentKeys = useMessengerState((s) => s.sentKeys);
  // 分类筛选：筛选期间列表只显示这一类，发送中的不显示（发消息会先退出筛选）
  const filter = useMessengerState((s) => (!threadId && s.filter?.dialogId === dialogId ? s.filter : null));
  const thread = useMessengerState((s) => (threadId && s.thread?.msgId === threadId ? s.thread : null));
  const chatRef = useRef<ChatViewHandle>(null);
  const composerRef = useRef<ComposerHandle>(null);
  // 输入栏内容：从草稿开始，输入栏和上方的候选浮层共用
  const compose = useComposeStore(() => htmlToCompose(threadId ? '' : (messenger?.store.getState().drafts[dialogId] ?? '')));
  const pickerKeysRef: PickerKeys = useRef(null);

  // 打开时的未读快照：上报已读会把会话上的这两项清掉
  const [opening] = useState(() => (threadId ? { unreadOne: 0, mentions: [] } : { unreadOne: dialog?.unread_one ?? 0, mentions: dialog?.mention_ids ?? [] }));
  const [mentions, setMentions] = useState<readonly number[]>(opening.mentions);
  const [located, setLocated] = useState(!!threadId);
  const [mode, setMode] = useState<ComposerMode>(null);
  const menuHost = useRef<MenuHostHandle>(null);
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [selection] = useState(createSelection);
  const actions = useMsgActions();
  const mentionSession = useMemo(() => actions?.mentionSession(dialogId, userId), [actions, dialogId, userId]);

  const list = win?.list;
  // 线程：回复从新到旧，回复都取完了最后接上被回复的那条（最旧）
  const threadList = useMemo(
    () => thread && (thread.root && !thread.earlier ? [...thread.list, { ...thread.root, prev_id: 0, next_id: 0 }] : thread.list),
    [thread],
  );
  const shown = threadList ?? (filter ? filter.list : list);
  const rows = useMemo(() => {
    if (threadList) {
      const mine = <T extends { reply_id?: number }>(items: T[]) => items.filter((item) => item.reply_id === threadId);
      return buildRows({ list: threadList, outbox: mine(outbox), uploads: mine(uploads), withdrawn: NONE, sentKeys, dialogId, userId });
    }
    return filter
      ? buildRows({ list: filter.list, outbox: NONE, uploads: NONE, withdrawn: NONE, sentKeys, dialogId, userId })
      : buildRows({ list: list ?? [], outbox, uploads, withdrawn, sentKeys, dialogId, userId });
  }, [threadList, threadId, filter, list, outbox, uploads, withdrawn, sentKeys, dialogId, userId]);
  const byId = useMemo(() => new Map((shown ?? []).map((m) => [String(m.id), m])), [shown]);

  // 打开、关闭会话；定位（locateAt 变了即重新定位）
  useEffect(() => {
    if (!messenger || !dialogId) return;
    // 线程页叠在聊天页上，会话由下面的聊天页开着
    if (threadId) {
      messenger.openThread(dialogId, threadId).catch((err) => showToast(errorText(err)));
      return () => messenger.closeThread();
    }
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
      if (!cancelled) {
        setLocated(true);
        if (reply) {
          const msg = messenger.store.getState().windows[dialogId]?.list.find((item) => item.id === msgId);
          if (msg) setMode({ kind: 'reply', msg });
        }
      }
    };
    void locate();
    return () => {
      cancelled = true;
      messenger.closeDialog(dialogId);
    };
  }, [messenger, dialogId, msgId, threadId, locateAt, reply, opening, errorText]);

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
    // 筛选、线程里只上报已读，不记位置、不划 @
    if (filter || threadId) {
      reportRead();
      return;
    }
    const numeric = ids.map(Number).filter((id) => id > 0);
    const newest = rows[0];
    if (newest && ids.includes(newest.id)) positions.delete(dialogId);
    else if (numeric.length) positions.set(dialogId, Math.min(...numeric));
    setMentions((prev) => (prev.some((id) => ids.includes(String(id))) ? prev.filter((id) => !ids.includes(String(id))) : prev));
    reportRead();
  }, [located, filter, threadId, rows, dialogId, reportRead]);
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

  // 跳到一条消息：筛选里没有它时先回到完整对话
  const jumpTo = useCallback(async (id: number, highlight = true) => {
    if (!messenger) return;
    // 线程里只在线程内找（引用的都是被回复的那条）
    if (threadId) {
      await chatRef.current?.scrollToMessage(String(id), { highlight });
      return;
    }
    const f = messenger.store.getState().filter;
    if (f?.dialogId === dialogId && !f.list.some((m) => m.id === id)) await messenger.setFilter(dialogId, null);
    await messenger.loadAround(dialogId, id).catch((err) => showToast(errorText(err)));
    await chatRef.current?.scrollToMessage(String(id), { highlight });
  }, [messenger, dialogId, threadId, errorText]);

  const onJump = useCallback((id: number) => void jumpTo(id), [jumpTo]);

  const openSheet = useCallback((content: SheetContent) => {
    Keyboard.dismiss();
    setSheet((prev) => ({ seq: (prev?.seq ?? 0) + 1, visible: true, content }));
  }, []);
  const closeSheet = useCallback(() => setSheet((prev) => prev && { ...prev, visible: false }), []);

  const forwardSelection = useCallback((msgIds: number[], merge: boolean) => {
    openSheet({ kind: 'forward', msgIds, multi: true, defaultMerge: merge });
  }, [openSheet]);
  const mergeSelection = useCallback((msgIds: number[]) => forwardSelection(msgIds, true), [forwardSelection]);
  // 同旧版：没全收藏就补齐没收藏的，全收藏了再点才是取消；成功后退多选
  const favoriteSelection = useCallback(async (msgIds: number[]) => {
    if (!actions || !messenger) return;
    const sorted = [...msgIds].sort((a, b) => a - b);
    try {
      const states = await Promise.all(sorted.map(async (id) => {
        await actions.checkFavorite(id);
        return messenger.store.getState().favorites[id] ?? false;
      }));
      const allOn = states.every(Boolean);
      const results = await Promise.all(sorted.filter((_, index) => states[index] === allOn).map((id) => actions.toggleFavorite(id)));
      if (results[0]) showToast(results[0].msg);
      selection.clear();
    } catch (err) {
      showToast(errorText(err));
    }
  }, [actions, messenger, errorText, selection]);

  const onReply = useCallback((msg: Msg) => {
    setMode({ kind: 'reply', msg });
  }, []);
  // useMessageMenus 只在选中菜单项时读取，不要求稳定
  // 线程里不单独回复某条：发出的都回复被回复的那条
  const canReply = canSend && !threadId;
  const handlers: MenuHandlers = {
    onReply: canReply ? onReply : undefined,
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
    onFullChat: filter
      ? (msg: Msg) => {
          void messenger?.setFilter(dialogId, null).then(() => jumpTo(msg.id));
        }
      : undefined,
  };
  const { menu, pendingMenu, uploadMenu } = useMessageMenus(handlers);

  // 多选：Shift 连选按显示顺序（从旧到新）取可转发的消息
  const selectable = useRef<number[]>([]);
  useEffect(() => {
    selectable.current = rows.flatMap((row) => (row.data.kind === 'msg' && forwardable(row.data.msg) ? [row.data.msg.id] : [])).reverse();
  }, [rows]);

  const onSelectLimit = useCallback(() => showToast(t('messenger:selection.max', { n: SELECTION_MAX })), [t]);
  const selectDrag = useSelectDrag(selection, onSelectLimit);

  const onReact = useCallback((msg: Msg, symbol: string) => {
    messenger?.toggleEmoji(msg, symbol).catch((err) => showToast(errorText(err)));
  }, [messenger, errorText]);

  // 点开图片时读最新的消息，回调本身保持稳定，不因新消息让所有行重画
  const shownRef = useRef(shown);
  useEffect(() => {
    shownRef.current = shown;
  }, [shown]);
  const showImage = useCallback(
    (url: string) =>
      openGallery({
        msgs: [...(shownRef.current ?? [])].reverse(),
        ctx: { userId, origin },
        url,
        canForward: forwardable,
        onForward: (id) => openSheet({ kind: 'forward', msgIds: [id] }),
        older: actions ? (prevId) => actions.imagePage(dialogId, prevId) : undefined,
      }),
    [userId, origin, openSheet, actions, dialogId],
  );

  const rowContext = useMemo<RowContext>(() => ({
    group: dialog?.type === 'group',
    body: { userId, origin },
    tones: bubbleTones(theme),
    newFrom: opening.unreadOne,
    menu,
    pendingMenu,
    uploadMenu,
    onOpen: (msg: Msg, body: MsgBody) => {
      if (body.kind === 'record') {
        messenger?.clearDot(msg);
        // 列表新的在前：播完取紧挨着的更新一条，是别人发的、还没听过的语音才接着播
        let current = msg.id;
        toggleVoice(body.url, AUTO_NEXT ? () => {
          const msgs = shownRef.current ?? [];
          const following = msgs[msgs.findIndex((m) => m.id === current) - 1];
          if (!following?.dot || following.userid === userId) return undefined;
          const next = msgContent(following, { userId, origin }).body;
          if (next.kind !== 'record') return undefined;
          current = following.id;
          messenger?.clearDot(following);
          return next.url;
        } : undefined);
      } else if (body.kind === 'rich' && body.long) {
        openLongText(msg.id);
      } else if (body.kind === 'image') {
        showImage(body.url);
      } else if (body.kind === 'video') {
        openMedia({ kind: 'video', url: body.url });
      } else if (body.kind === 'file') {
        openMsgFile(msg, body, t);
      } else if (body.kind === 'location') {
        void openLocation(body).catch(() => {});
      } else if (body.kind === 'wordChain' && canSend) {
        openSheet({ kind: 'wordChainJoin', msg });
      } else if (body.kind === 'mergeForward') {
        const title = mergeTitleText(body.title, t);
        if (rowTraits.mergePage) pushMerge(dialogId)(msg.id, title);
        else openSheet({ kind: 'merge', msgId: msg.id, title });
      }
    },
    onReact,
    onQuote: (id: number) => void jumpTo(id),
    onThread: threadId ? undefined : pushThread,
    onLongPress: (row: RowRef, info: MessageRenderInfo<RowData>, msg: Msg, body: MsgBody) => {
      row.measureInWindow((x, y, width, height) => menuHost.current?.open({ anchor: { x, y, width, height }, info, msg, body }));
    },
    onReply: canReply ? onReply : undefined,
    onHover: (msg: Msg) => {
      if (actions && !(msg.id in (messenger?.store.getState().favorites ?? {}))) actions.checkFavorite(msg.id).catch(() => {});
    },
    onTranslation: (msg: Msg) => openSheet({ kind: 'translate', msg }),
    onReadList: (msgId: number) => openSheet({ kind: 'readList', msgId }),
    onReactionList: (reactions: readonly Reaction[], symbol: string) => openSheet({ kind: 'reactions', reactions, symbol }),
    selection: selection.store,
    onSelect: (msg: Msg, extend: boolean) => {
      const ok = extend ? selection.extend(msg.id, selectable.current) : selection.toggle(msg.id);
      if (!ok) onSelectLimit();
    },
    selectDrag,
    onReEdit: canSend
      ? (item: WithdrawnMsg) => {
          composerRef.current?.replace(item.md ? { text: item.text, mentions: [] } : htmlToCompose(item.text));
          messenger?.forgetWithdrawn(item.id);
        }
      : undefined,
  }), [canSend, canReply, threadId, dialog?.type, dialogId, t, userId, origin, theme, opening.unreadOne, menu, pendingMenu, uploadMenu, messenger, actions, onReact, jumpTo, onReply, openSheet, selection, selectDrag, onSelectLimit, showImage]);

  const openHref = useOpenHref();
  const richHandlers = useMemo<RichHandlers>(() => ({
    onPressRun: (run) => {
      // 快捷命令（机器人帮助里的 /help 等）：mark-set 换掉输入框内容，mark-insert 插在光标处；不能发言时不处理
      if (run.fill) {
        if (!canSend) return;
        if (run.fill === 'set') composerRef.current?.replace({ text: run.text, mentions: [] });
        else composerRef.current?.insertText(run.text);
      } else if (run.href) openHref(run.href);
    },
    onPressImage: (block) => {
      if (block.url) showImage(block.url);
    },
    onToggleCheck: canSend && actions ? (msg, index, checked) => void actions.checkItem(msg, index, checked).catch((err) => showToast(errorText(err))) : undefined,
  }), [canSend, showImage, openHref, actions, errorText]);

  const language = useLanguage();
  const today = useToday();
  const renderDay = useCallback((createdAt: number) => <Text style={styles.day}>{dayLabel(createdAt, today, t, dateFormats(language))}</Text>, [today, t, language]);
  const renderScrollToBottom = useCallback((info: ScrollToBottomInfo) => <ScrollToBottom newCount={info.newCount} />, []);

  const loading = win?.loading ?? null;
  const filtering = !!filter;
  const onLoadEarlier = useCallback(() => {
    const load = threadId ? messenger?.loadThreadEarlier() : filtering ? messenger?.loadFilterEarlier() : messenger?.loadEarlier(dialogId);
    void load?.catch((err) => showToast(errorText(err)));
  }, [messenger, dialogId, threadId, filtering, errorText]);
  const onLoadNewer = useCallback(() => void messenger?.loadNewer(dialogId).catch((err) => showToast(errorText(err))), [messenger, dialogId, errorText]);
  const onJumpToLatest = useCallback(async () => {
    await messenger?.loadLatest(dialogId).catch((err) => showToast(errorText(err)));
  }, [messenger, dialogId, errorText]);
  // 发出消息回到完整对话（同旧版 App），滚到底
  const onSent = useCallback(() => {
    if (!threadId) void messenger?.setFilter(dialogId, null);
    chatRef.current?.scrollToBottom();
  }, [messenger, dialogId, threadId]);
  // 换分类时回到最新一端
  const filterType = filter?.type ?? null;
  const shownType = useRef(filterType);
  useEffect(() => {
    if (shownType.current === filterType) return;
    shownType.current = filterType;
    chatRef.current?.scrollToBottom();
  });
  // 筛选待办时取我没完成的，标成警示色；待办数变了重新取
  const [myTodos, setMyTodos] = useState<ReadonlySet<number>>();
  const todoNum = dialog?.todo_num ?? 0;
  useEffect(() => {
    if (filterType !== 'todo' || !actions) return;
    let cancelled = false;
    actions
      .myTodos(dialogId)
      .then((todos) => !cancelled && setMyTodos(new Set(todos.map((todo) => todo.msg_id))))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [filterType, todoNum, actions, dialogId]);
  const onModeEnd = useCallback(() => setMode(null), []);
  // ↑ 编辑上一条：自己最新的一条已发出的文字消息（列表从新到旧）
  const onEditLast = () => {
    const last = rows.find((row) => row.data.kind === 'msg' && row.data.msg.userid === userId && row.data.msg.type === 'text');
    if (last?.data.kind !== 'msg') return false;
    setMode({ kind: 'edit', msg: last.data.msg });
    return true;
  };
  const attach = useAttach({ dialogId, mode, threadId, onModeEnd, onSent });
  const onConverted = useCallback((text: string) => composerRef.current?.insertText(text), []);
  const voice = useVoiceInput({ dialogId, mode, threadId, onModeEnd, onSent, onConverted });
  const extras = useExtras({ dialog, userId, openSheet, aiEnabled: aiModels.groups.length > 0, openAi });
  const openFullInput = useCallback(() => composerRef.current?.openFullInput(), []);
  // 加号面板按入口排数定高（同旧版 App）；Web 不打开加号面板
  const moreHeight = morePanelHeight(theme, extras.length, aiBot);
  const panelHeights = useMemo(() => ({ more: moreHeight }), [moreHeight]);

  const onStickerSearch = useCallback(() => openSheet({ kind: 'stickerSearch' }), [openSheet]);
  const nextMention = mentions.length ? Math.min(...mentions) : 0;
  // 面板一直挂着：元素要稳定，否则页面每次重渲染（如开始、结束录音）都连带重渲染整个表情面板
  const emojiPanel = useMemo(() => (
    <EmojiPanel
      origin={origin}
      onInsert={(emoji) => composerRef.current?.insert(emoji)}
      onDelete={() => composerRef.current?.backspace()}
      onSend={(item) => composerRef.current?.sendEmoticon(item, false)}
      onSearch={onStickerSearch}
    />
  ), [origin, onStickerSearch]);
  // 传给列表的元素要稳定，每次新建会让整个消息列表跟着重渲染
  const loadingIndicator = useMemo(() => <ActivityIndicator color={theme.colors.text3} />, [theme.colors.text3]);

  return (
    <View style={styles.root}>
      <RowContextValue.Provider value={rowContext}>
        <MyTodosContext.Provider value={filterType === 'todo' ? myTodos : undefined}>
          <RichHandlersContext.Provider value={richHandlers}>
            <ChatDropZone onFiles={attach.offer} disabled={!canSend}>
              <ChatView
                ref={chatRef}
                messages={rows}
                scrollLock={selectDrag.scrollLock}
                currentUserId={String(userId)}
                renderMessage={renderMessage}
                renderDay={rowTraits.dayLabels ? renderDay : undefined}
                header={!threadId && <ChatTopBar dialogId={dialogId} dialog={dialog} selection={selection} onJump={onJump} onSessionChanged={onSent} />}
                composer={
                  <BottomBar selection={selection} onForward={forwardSelection} onMerge={mergeSelection} onFavorite={favoriteSelection}>
                    {block ? (
                      <ComposerNotice text={t(block === 'muted' ? 'messenger:chat.muted' : 'messenger:chat.disabled')} />
                    ) : (
                      <>
                        {dialog && !mode && !threadId && <QuickMsgBar dialog={dialog} onSent={onSent} />}
                        <Composer ref={composerRef} dialogId={dialogId} store={compose} pickerKeysRef={pickerKeysRef} mentionSession={mentionSession} mode={mode} threadId={threadId} onModeEnd={onModeEnd} onEditLast={onEditLast} onSent={onSent} onStickerSearch={onStickerSearch} attach={attach} extras={extras} voice={CAN_RECORD ? voice : null} />
                      </>
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
                  more: <MorePanel attach={attach} extras={extras} aiBot={aiBot} onFullInput={openFullInput} />,
                }}
                panelHeights={panelHeights}
                keyboardDragOffset={theme.size.touch + theme.spacing.xs * 2}
                renderScrollToBottom={renderScrollToBottom}
                floating={nextMention > 0 && <MentionJump count={mentions.length} onPress={() => void jumpTo(nextMention)} />}
                onVisibleChange={onVisibleChange}
                highlightColor={theme.colors.rowHighlight}
                listHidden={!located}
                loadingIndicator={loadingIndicator}
                emptyContent={(thread ? thread.ready : filter ? filter.ready : win?.synced) ? <Text style={styles.empty}>{t('messenger:chat.empty')}</Text> : <ActivityIndicator color={theme.colors.text3} />}
                hasEarlier={thread ? thread.ready && thread.earlier > 0 : filter ? filter.ready && filter.earlier > 0 : !!win?.synced && hasEarlier(win.list)}
                loadingEarlier={thread ? thread.ready && thread.loading : filter ? filter.ready && filter.loading : loading === 'earlier'}
                onLoadEarlier={onLoadEarlier}
                hasNewer={!filter && !threadId && !!list && !atLatest(list)}
                loadingNewer={loading === 'newer'}
                onLoadNewer={onLoadNewer}
                onJumpToLatest={onJumpToLatest}
              />
            </ChatDropZone>
          </RichHandlersContext.Provider>
        </MyTodosContext.Provider>
        <MenuHost ref={menuHost} group={dialog?.type === 'group'} userId={userId} menu={menu} onReact={onReact} />
      </RowContextValue.Provider>
      {attach.preview && <SendPreview {...attach.preview} onClose={attach.closePreview} onSend={attach.send} />}
      {aiCompose && <AiComposeModal dialogId={dialogId} config={aiModels} draft={compose.get().value.text} quote={mode?.kind === 'reply' ? mode.msg : undefined} onClose={() => setAiCompose(false)} onApply={(value) => composerRef.current?.replace(value)} />}
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
      return <ForwardSheet {...common} dialogId={dialogId} msgIds={content.msgIds} multi={content.multi} defaultMerge={content.defaultMerge} onSent={onForwarded} />;
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
    case 'reactions':
      return <ReactionListSheet {...common} reactions={content.reactions} symbol={content.symbol} />;
    case 'selectText':
      return <SelectTextSheet {...common} text={content.text} />;
    case 'stickerSearch':
      return <StickerSearchSheet {...common} onPick={onPickSticker} />;
    case 'vote':
      return <VoteSheet {...common} dialogId={dialogId} onSent={onSent} />;
    case 'wordChain':
      return <WordChainSheet {...common} dialogId={dialogId} onSent={onSent} />;
    case 'wordChainJoin':
      return <WordChainSheet {...common} dialogId={dialogId} msg={content.msg} onSent={onSent} />;
    case 'merge':
      return <MergeDetailSheet {...common} dialogId={dialogId} msgId={content.msgId} title={content.title} />;
    case 'anon':
      return <AnonSheet {...common} userid={content.userid} />;
  }
}

/**
 * 输入栏位置：多选时换成多选栏（App 是图标按钮，Web 是旧版网页的操作条）。输入栏只是藏起来，草稿、回复状态都还在。
 * 多选时系统返回键先退出多选
 */
function BottomBar({ selection, onForward, onMerge, onFavorite, children }: {
  selection: Selection;
  onForward: (msgIds: number[], merge: boolean) => void;
  onMerge: (msgIds: number[]) => void;
  onFavorite: (msgIds: number[]) => void;
  children: ReactNode;
}) {
  const active = useStore(selection.store, (s) => s.active);

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
      {active && <SelectionBar selection={selection} onForward={onForward} onMerge={onMerge} onFavorite={onFavorite} />}
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
  root: { flex: 1, backgroundColor: theme.colors[rowTraits.listBg] },
  day: {
    ...theme.typography.caption,
    color: theme.colors.text3,
    textAlign: 'center',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xs,
  },
  empty: { ...theme.typography.subhead, color: theme.colors.text3 },
  hidden: { display: 'none' },
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
