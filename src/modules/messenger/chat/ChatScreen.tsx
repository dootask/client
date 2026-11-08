import { useLocalSearchParams } from 'expo-router';
import { AtSign, ChevronDown } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Linking, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { dateFormats, useLanguage, useT } from '../../../i18n';
import type { Msg } from '../../../sync/api/dialog';
import { atLatest, hasEarlier, htmlToText, type WithdrawnMsg } from '../../../sync/messenger';
import type { MsgBody } from '../../../sync/messenger/body';
import { ChatView, type ChatViewHandle, type MessageRenderInfo, type ScrollToBottomInfo } from '../../../ui/chat';
import { Icon } from '../../../ui/Icon';
import { showToast } from '../../../ui/Toast';
import { Touchable } from '../../../ui/Touchable';
import { useErrorText, useSession } from '../../session';
import { useToday } from '../clock';
import { useDialog, useMessenger, useMessengerState } from '../hooks';
import { ChatHeader } from './ChatHeader';
import { buildRows, type RowData } from './chatModel';
import { Composer, type ComposerHandle, type ComposerMode } from './Composer';
import { EmojiPanel } from './EmojiPanel';
import { countText, dayLabel } from './format';
import { useMessageMenus } from './messageMenu';
import { bubbleTones, MessageRow, RowContextValue, type RowContext } from './MessageRow';
import { RichHandlersContext, type RichHandlers } from './RichText';
import { toggleVoice } from './voice';

/** 离开会话时最上面看到的那条，下次打开回到这里（本次运行内） */
const positions = new Map<number, number>();

/** 定位迟迟找不到目标（消息已删除等）时，最多等这么久就显示列表 */
const LOCATE_TIMEOUT = 3000;

/** 第一条未读贴顶时，上方再露出几条 */
const UNREAD_ABOVE = 2;

const renderMessage = (info: MessageRenderInfo<RowData>) => <MessageRow info={info} />;

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
  const server = useSession((s) => s.server);
  const dialog = useDialog(dialogId);
  const win = useMessengerState((s) => s.windows[dialogId]);
  const outbox = useMessengerState((s) => s.outbox);
  const withdrawn = useMessengerState((s) => s.withdrawn);
  const sentKeys = useMessengerState((s) => s.sentKeys);
  const chatRef = useRef<ChatViewHandle>(null);
  const composerRef = useRef<ComposerHandle>(null);

  // 打开时的未读快照：上报已读会把会话上的这两项清掉
  const [opening] = useState(() => ({ unreadOne: dialog?.unread_one ?? 0, mentions: dialog?.mention_ids ?? [] }));
  const [mentions, setMentions] = useState<readonly number[]>(opening.mentions);
  const [located, setLocated] = useState(false);
  const [mode, setMode] = useState<ComposerMode>(null);

  const list = win?.list;
  const rows = useMemo(
    () => buildRows({ list: list ?? [], outbox, withdrawn, sentKeys, dialogId, userId }),
    [list, outbox, withdrawn, sentKeys, dialogId, userId],
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

  const onReply = useCallback((msg: Msg) => {
    setMode({ kind: 'reply', msg });
  }, []);
  const onEdit = useCallback((msg: Msg) => {
    setMode({ kind: 'edit', msg });
  }, []);
  const { menu, pendingMenu } = useMessageMenus({ onReply, onEdit });

  const rowContext = useMemo<RowContext>(() => ({
    group: dialog?.type === 'group',
    body: { userId, origin: `${server}/` },
    tones: bubbleTones(theme.colors),
    newFrom: opening.unreadOne,
    menu,
    pendingMenu,
    onOpen: (msg: Msg, body: MsgBody) => {
      if (body.kind === 'record') {
        void toggleVoice(body.url);
        messenger?.clearDot(msg);
      } else if (body.kind === 'image' || body.kind === 'video' || body.kind === 'file') {
        void Linking.openURL(body.url).catch(() => {});
      }
    },
    onReact: (msg: Msg, symbol: string) => {
      messenger?.toggleEmoji(msg, symbol).catch((err) => showToast(errorText(err)));
    },
    onQuote: (id: number) => void jumpTo(id),
    onReEdit: (item: WithdrawnMsg) => {
      composerRef.current?.replace(item.md ? item.text : htmlToText(item.text));
      messenger?.forgetWithdrawn(item.id);
    },
  }), [dialog?.type, userId, server, theme.colors, opening.unreadOne, menu, pendingMenu, messenger, errorText, jumpTo]);

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

  const nextMention = mentions.length ? Math.min(...mentions) : 0;

  return (
    <View style={styles.root}>
      <RowContextValue.Provider value={rowContext}>
        <RichHandlersContext.Provider value={richHandlers}>
          <ChatView
            ref={chatRef}
            messages={rows}
            currentUserId={String(userId)}
            renderMessage={renderMessage}
            renderDay={renderDay}
            header={<ChatHeader dialogId={dialogId} dialog={dialog} />}
            composer={<Composer ref={composerRef} dialogId={dialogId} mode={mode} onModeEnd={onModeEnd} onSent={onSent} />}
            bottomColor={theme.colors.surface}
            panels={{ emoji: <EmojiPanel onPick={(emoji) => composerRef.current?.insert(emoji)} /> }}
            keyboardDragOffset={theme.size.touch + theme.spacing.xs * 2}
            renderScrollToBottom={renderScrollToBottom}
            floating={nextMention > 0 && <MentionJump count={mentions.length} onPress={() => void jumpTo(nextMention)} />}
            onVisibleChange={onVisibleChange}
            highlightColor={theme.colors.rowHighlight}
            listHidden={!located}
            loadingIndicator={<ActivityIndicator color={theme.colors.text3} />}
            emptyContent={win?.synced ? <Text style={styles.empty}>{t('messenger:chat.empty')}</Text> : <ActivityIndicator color={theme.colors.text3} />}
            hasEarlier={!!win?.synced && hasEarlier(win.list)}
            loadingEarlier={loading === 'earlier'}
            onLoadEarlier={onLoadEarlier}
            hasNewer={!!list && !atLatest(list)}
            loadingNewer={loading === 'newer'}
            onLoadNewer={onLoadNewer}
            onJumpToLatest={onJumpToLatest}
          />
        </RichHandlersContext.Provider>
      </RowContextValue.Provider>
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
  pressed: { opacity: theme.opacity.pressedIcon },
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
