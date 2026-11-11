import { Image } from 'expo-image';
import { Bookmark, Check, CheckCheck, CircleAlert, Forward, ListTodo, MessageSquareText, Pencil, X } from 'lucide-react-native';
import { createContext, memo, useContext, useEffect, type ReactNode } from 'react';
import { ActivityIndicator, type GestureResponderEvent, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useStore } from 'zustand';

import { useT } from '../../../i18n';
import type { Msg } from '../../../sync/api/dialog';
import { toUnix, type OutboxItem, type UploadItem, type WithdrawnMsg } from '../../../sync/messenger';
import { msgContent, reactions, textBlocks, type BodyContext, type MsgBody, type Reaction, type ReplyInfo, type SystemLabel } from '../../../sync/messenger/body';
import { UserAvatar } from '../../../ui/Avatar';
import { CheckMark } from '../../../ui/CheckMark';
import { RowHighlight, type MessageRenderInfo } from '../../../ui/chat';
import { Icon } from '../../../ui/Icon';
import { Menu, type MenuEntry } from '../../../ui/popover';
import { Touchable } from '../../../ui/Touchable';
import { useMessenger, useMessengerState, useUser } from '../hooks';
import { PreviewText } from '../PreviewText';
import { BubbleTouch } from './BubbleTouch';
import type { BubbleTouchProps, RowRef } from './bubbleTouchTypes';
import { chained, isSystemRow, type ChatRow, type RowData } from './chatModel';
import { LIKE } from './emoji';
import { ReactionTip } from './ReactionTip';
import { forwardable } from './messageMenu';
import { FileCard, isMediaBody, isStickerBody, LocalMedia, MediaBody, MessageBody, RecordBody, StickerBody } from './MessageBody';
import { msgExtra } from './msgExtra';
import { type BubbleTone, RichBlocks } from './RichText';
import type { SelectDrag } from './selectDrag';
import { selectCell, selectRowHighlight } from './selectTraits';
import { SelectHandle } from './SelectHandle';
import type { Selection } from './selection';

/**
 * 聊天列表的一行：气泡（文字、图片、文件、语音）、系统提示、发送中 / 失败（文字、文件）、撤回占位。
 * 行组件 memo，数据没变的行不重画；行里要用的回调都在 RowContext 里，聊天页给的是稳定对象
 */

export interface RowContext {
  group: boolean;
  body: BodyContext;
  tones: { own: BubbleTone; peer: BubbleTone };
  /** 打开会话时的第一条未读，上方画「以下为新消息」 */
  newFrom: number;
  /** 菜单项，打开时才计算：Web 右键、悬停条「更多」 */
  menu: (msg: Msg, body: MsgBody, own: boolean) => readonly MenuEntry[];
  pendingMenu: (item: OutboxItem) => readonly MenuEntry[];
  uploadMenu: (item: UploadItem) => readonly MenuEntry[];
  /** App 长按：row 是整行（量位置浮起重画） */
  onLongPress: (row: RowRef, info: MessageRenderInfo<RowData>, msg: Msg, body: MsgBody) => void;
  /** 右滑（App）、悬停条（Web）回复；不能发言时没有 */
  onReply?: (msg: Msg) => void;
  /** Web 鼠标移上来：预取菜单要用的收藏状态 */
  onHover: (msg: Msg) => void;
  /** 点气泡：打开图片、文件，播放语音，查看全文 */
  onOpen: (msg: Msg, body: MsgBody) => void;
  /** 点回应胶囊、双击、表情条（自己回应过的再点即取消） */
  onReact: (msg: Msg, symbol: string) => void;
  /** 长按回应胶囊：回应详情（谁回应了） */
  onReactionList: (reactions: readonly Reaction[], symbol: string) => void;
  /** 点回复引用：跳到原消息 */
  onQuote: (id: number) => void;
  /** 点译文：换语言、重新翻译 */
  onTranslation: (msg: Msg) => void;
  /** 群里点自己消息的已读圆环：已读名单 */
  onReadList: (msgId: number) => void;
  /** 撤回后重新编辑；不能发言时没有 */
  onReEdit?: (item: WithdrawnMsg) => void;
  /** 多选：行只订阅自己是否选中 */
  selection: Selection['store'];
  /** 多选时点一条；extend 是按住 Shift（Web）连选 */
  onSelect: (msg: Msg, extend: boolean) => void;
  /** 多选：App 从勾选圈上下拖动连续勾选 */
  selectDrag: SelectDrag;
}

export const RowContextValue = createContext<RowContext | null>(null);

const useRowContext = () => useContext(RowContextValue)!;

/** 筛选待办时我还没完成的消息 id（同旧版 App 标成警示色）。单独走 context：换筛选时只重画待办图标 */
export const MyTodosContext = createContext<ReadonlySet<number> | undefined>(undefined);

function TodoMark({ id, color }: { id: number; color: string }) {
  const { theme } = useUnistyles();
  const mine = useContext(MyTodosContext)?.has(id);
  return <Icon icon={ListTodo} color={mine ? theme.colors.warning : color} size={12} />;
}

/** 点了有反应的消息体 */
const OPENABLE = new Set<MsgBody['kind']>(['image', 'video', 'file', 'record']);

const SYSTEM_LABELS = {
  tagAdd: 'messenger:system.tagAdd',
  tagRemove: 'messenger:system.tagRemove',
  topAdd: 'messenger:system.topAdd',
  topRemove: 'messenger:system.topRemove',
  todoAdd: 'messenger:system.todoAdd',
  todoRemove: 'messenger:system.todoRemove',
  todoDone: 'messenger:system.todoDone',
  todoTarget: 'messenger:system.todoTarget',
  withdrawSelf: 'messenger:system.withdrawSelf',
} as const satisfies Record<SystemLabel, string>;

export function bubbleTones(colors: ReturnType<typeof useUnistyles>['theme']['colors']): RowContext['tones'] {
  const base = { link: colors.link, overlay: colors.bubbleOverlay, separator: colors.separator, scrim: colors.mediaScrim, danger: colors.danger, accent: colors.primaryText };
  return {
    own: { ...base, text: colors.bubbleOutText, muted: colors.bubbleOutMeta },
    peer: { ...base, text: colors.bubbleInText, muted: colors.bubbleInMeta },
  };
}

/** 消息内时间：本地时区 HH:mm */
function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** 名字：AI 助手（userid -1）用消息带的名字 */
function useName(userid: number, aiName?: string): string {
  const t = useT();
  const user = useUser(userid);
  if (userid === -1) return aiName || t('messenger:chat.ai');
  return user?.nickname ?? '';
}

/** 列表每次重渲染都会给每行新的 info 对象，按字段比较，内容没变的行不重渲染 */
function sameInfo(prev: { info: MessageRenderInfo<RowData> }, next: { info: MessageRenderInfo<RowData> }): boolean {
  const a = prev.info;
  const b = next.info;
  return a.message === b.message && a.older === b.older && a.newer === b.newer && a.isOwn === b.isOwn;
}

export const MessageRow = memo(function MessageRow({ info }: { info: MessageRenderInfo<RowData> }) {
  const ctx = useRowContext();
  const { theme } = useUnistyles();
  const { message, older, newer } = info;
  const gap = rowGap(message, older, theme.spacing);
  // 定位高亮只盖消息本身，上下留出一样的空：取与上一条、下一条间距较小者的一半，碰不到相邻的消息
  const pad = (newer ? Math.min(gap, rowGap(newer, message, theme.spacing)) : gap) / 2;
  const data = message.data;
  return (
    <View>
      {data.kind === 'msg' && data.msg.id === ctx.newFrom && <NewMsgDivider />}
      <View style={{ paddingTop: gap }}>
        <RowHighlight style={{ top: gap - pad, bottom: -pad }} />
        {data.kind === 'msg' &&
          (isSystemRow(message) ? (
            <SystemRow msg={data.msg} />
          ) : (
            <Selectable msg={data.msg}>
              <MsgRow info={info} msg={data.msg} />
            </Selectable>
          ))}
        {data.kind === 'pending' && <PendingRow info={info} item={data.item} />}
        {data.kind === 'upload' && <UploadRow info={info} item={data.item} />}
        {data.kind === 'withdrawn' && <WithdrawnRow item={data.item} />}
      </View>
    </View>
  );
}, sameInfo);

const shiftKey = (event: GestureResponderEvent) => !!(event.nativeEvent as { shiftKey?: boolean }).shiftKey;

/** 多选模式：左侧勾选圈，点整行选中；消息本身不再响应点按、长按。不能转发的消息不能选 */
function Selectable({ msg, children }: { msg: Msg; children: ReactNode }) {
  const ctx = useRowContext();
  const { theme } = useUnistyles();
  const active = useStore(ctx.selection, (s) => s.active);
  const checked = useStore(ctx.selection, (s) => s.ids.has(msg.id));
  if (!active) return children;
  const can = forwardable(msg);
  return (
    <Touchable
      accessibilityRole="checkbox"
      aria-checked={checked} aria-disabled={!can}
      disabled={!can}
      onPress={(event) => ctx.onSelect(msg, shiftKey(event))}
      ref={(view) => {
        if (!can) return undefined;
        ctx.selectDrag.register(msg.id, view);
        return () => ctx.selectDrag.register(msg.id, null);
      }}
      style={[styles.selectRow, checked && selectRowHighlight && styles.selectRowChecked]}
    >
      {can ? (
        <SelectHandle msgId={msg.id} drag={ctx.selectDrag} style={selectCell(theme)}>
          <CheckMark checked={checked} />
        </SelectHandle>
      ) : (
        <View style={selectCell(theme)} />
      )}
      <View style={styles.selectBody}>{children}</View>
    </Touchable>
  );
}

/** 与上一条的间距：连续消息收紧，系统提示多留一点 */
function rowGap(message: ChatRow, older: ChatRow | undefined, spacing: { sm: number; md: number }): number {
  if (isSystemRow(message)) return spacing.md;
  return chained(message, older) ? 2 : spacing.sm;
}

/** 打开时第一条未读上方的分割线 */
function NewMsgDivider() {
  const t = useT();
  return (
    <View style={styles.newDivider}>
      <View style={styles.newDividerLine} />
      <Text style={styles.newDividerText}>{t('messenger:chat.newMessages')}</Text>
      <View style={styles.newDividerLine} />
    </View>
  );
}

const DIM_OPACITY = 0.6;
const DIM_TIMING = { duration: 200, easing: Easing.out(Easing.quad) };

/** 发送中压暗；发送中与发出后是同一行（同一个键），发出时渐变回来 */
function Dimmed({ on, children }: { on: boolean; children: ReactNode }) {
  const opacity = useSharedValue(on ? DIM_OPACITY : 1);
  useEffect(() => {
    opacity.set(withTiming(on ? DIM_OPACITY : 1, DIM_TIMING));
  }, [on, opacity]);
  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={animated}>{children}</Animated.View>;
}

/** 交给 BubbleTouch 的手势与菜单（外框之外的部分） */
type Touch = Omit<BubbleTouchProps, 'own' | 'rowStyle' | 'bubbleStyle' | 'leading' | 'children'>;

/**
 * 气泡外框：左右对齐、连续消息圆角收紧、底色；对方在群里时左侧是头像列（连续消息只在最后一条显示头像）。
 * 点按、长按、右键、右滑、悬停交给 BubbleTouch
 */
function BubbleFrame({ info, variant, leading, touch, children }: {
  info: MessageRenderInfo<RowData>;
  /** media：图片视频（内边距收窄）；bare：不套气泡（表情） */
  variant?: 'media' | 'bare';
  leading?: ReactNode;
  touch: Touch;
  children: ReactNode;
}) {
  const { message, older, newer, isOwn } = info;
  const joinOlder = chained(message, older);
  const joinNewer = chained(message, newer);
  return (
    <BubbleTouch
      own={isOwn}
      rowStyle={[styles.row, isOwn ? styles.rowOwn : styles.rowPeer]}
      leading={leading !== undefined ? <View style={styles.leading}>{joinNewer ? null : leading}</View> : undefined}
      bubbleStyle={[
        styles.bubble,
        variant === 'bare' ? styles.bubbleBare(isOwn) : styles.bubbleColor(isOwn, joinOlder, joinNewer),
        variant === 'media' && styles.bubbleMedia,
      ]}
      {...touch}
    >
      {children}
    </BubbleTouch>
  );
}

/** 长按浮起时重画的那条消息（不带定位高亮和间距） */
export const MessagePreview = MsgRow;

function MsgRow({ info, msg }: { info: MessageRenderInfo<RowData>; msg: Msg }) {
  const ctx = useRowContext();
  const t = useT();
  const { isOwn, message, older } = info;
  const tone = isOwn ? ctx.tones.own : ctx.tones.peer;
  const { body, reply, forward } = msgContent(msg, ctx.body);
  const name = useName(msg.userid);
  const user = useUser(msg.userid);
  const forwardName = useName(forward?.userid ?? 0);
  const peerInGroup = ctx.group && !isOwn;
  const showName = peerInGroup && !chained(message, older) && !!name;
  const leading = peerInGroup ? <UserAvatar uri={user?.userimg} userid={msg.userid} name={name} bot={!!user?.bot} size={32} /> : undefined;
  const replyNum = msgExtra(msg).reply_num ?? 0;
  const list = reactions(msg, ctx.body.userId);

  const hasHeader = showName || !!forward || !!reply;
  const hasFooter = list.length > 0 || replyNum > 0;
  const onPress = OPENABLE.has(body.kind) || (body.kind === 'rich' && body.long) ? () => ctx.onOpen(msg, body) : undefined;
  const touch: Touch = {
    onPress,
    menu: () => ctx.menu(msg, body, isOwn),
    onLongPress: (row) => ctx.onLongPress(row, info, msg, body),
    onReply: ctx.onReply && (() => ctx.onReply?.(msg)),
    onDoubleTap: () => ctx.onReact(msg, LIKE),
    onReact: (symbol) => ctx.onReact(msg, symbol),
    onHover: () => ctx.onHover(msg),
  };
  const meta = (onMedia: boolean) => <Meta msg={msg} own={isOwn} tone={tone} onMedia={onMedia} />;

  // 表情：不套气泡，时间在下方
  if (isStickerBody(body) && !hasHeader && !hasFooter) {
    return (
      <BubbleFrame info={info} variant="bare" leading={leading} touch={touch}>
        <StickerBody body={body} />
        <View style={styles.stickerMeta}>{meta(true)}</View>
      </BubbleFrame>
    );
  }

  const media = isMediaBody(body);
  const header = hasHeader && (
    <View style={[styles.header, media && styles.mediaPad]}>
      {showName && <Text style={styles.senderName} numberOfLines={1}>{name}</Text>}
      {forward && (
        <View style={styles.forward}>
          <Icon icon={Forward} color={tone.muted} size={14} />
          <Text style={[styles.caption, { color: tone.muted }]} numberOfLines={1}>
            {t('messenger:chat.forwardFrom', { name: forwardName })}
          </Text>
        </View>
      )}
      {reply && <ReplyQuote reply={reply} tone={tone} />}
    </View>
  );
  const footer = hasFooter && (
    <View style={[styles.footer, media && styles.mediaPad]}>
      {replyNum > 0 && (
        <View style={styles.replyNum}>
          <Icon icon={MessageSquareText} color={tone.accent} size={14} />
          <Text style={[styles.caption, { color: tone.accent }]}>{t('messenger:chat.replies', { n: replyNum })}</Text>
        </View>
      )}
      {list.length > 0 && (
        <View style={styles.reactions}>
          {list.map((reaction) => (
            <ReactionTip key={reaction.symbol} userids={reaction.userids}>
              <Touchable
                onPress={() => ctx.onReact(msg, reaction.symbol)}
                onLongPress={() => ctx.onReactionList(list, reaction.symbol)}
                accessibilityRole="button"
                style={({ pressed, hovered }) => [
                  styles.reaction,
                  { backgroundColor: reaction.mine ? tone.accent : tone.overlay },
                  (pressed || hovered) && styles.reactionActive(pressed),
                ]}
              >
                <Text style={styles.reactionSymbol} allowFontScaling={false}>{reaction.symbol}</Text>
                <Text style={[styles.reactionCount, reaction.mine ? styles.reactionCountMine : { color: tone.text }]}>{reaction.userids.length}</Text>
              </Touchable>
            </ReactionTip>
          ))}
        </View>
      )}
    </View>
  );

  if (media) {
    // 没有底部内容时时间浮在图片上，否则放在底部内容的右下角；只有图片时不套气泡底色
    return (
      <BubbleFrame info={info} variant={hasHeader || hasFooter ? 'media' : 'bare'} leading={leading} touch={touch}>
        {header}
        <MediaBody body={body} overlay={!hasFooter && <View style={styles.mediaMeta}>{meta(true)}</View>} />
        {footer}
        {hasFooter && <View style={styles.mediaPad}>{meta(false)}</View>}
      </BubbleFrame>
    );
  }

  return (
    <BubbleFrame info={info} leading={leading} touch={touch}>
      {header}
      <MessageBody body={body} tone={tone} unplayed={!isOwn && !!msg.dot} />
      <Understanding msg={msg} tone={tone} />
      {footer}
      {meta(false)}
    </BubbleFrame>
  );
}

/** 气泡里正文下方：本地显示的译文；翻译、转文字进行中的提示 */
function Understanding({ msg, tone }: { msg: Msg; tone: BubbleTone }) {
  const t = useT();
  const ctx = useRowContext();
  const translation = useMessengerState((s) => s.translations[msg.id]);
  const busy = useMessengerState((s) => s.busy[msg.id]);
  if (!translation && !busy) return null;
  return (
    <>
      <View style={[styles.divider, { backgroundColor: tone.separator }]} />
      {busy ? (
        <View style={styles.busy}>
          <ActivityIndicator size="small" color={tone.muted} />
          <Text style={[styles.caption, { color: tone.muted }]}>{t(busy === 'translate' ? 'messenger:action.translating' : 'messenger:action.voice2texting')}</Text>
        </View>
      ) : (
        translation && (
          <Touchable accessibilityRole="button" onPress={() => ctx.onTranslation(msg)} style={({ pressed }) => pressed && styles.pressed}>
            <TranslationText msg={msg} content={translation.content} tone={tone} />
          </Touchable>
        )
      )}
    </>
  );
}

/** 译文：文本消息的译文和原文同格式（Markdown 或编辑器 HTML），按块结构画；其余（语音转文字）是纯文本 */
function TranslationText({ msg, content, tone }: { msg: Msg; content: string; tone: BubbleTone }) {
  const ctx = useRowContext();
  if (msg.type !== 'text' && msg.type !== 'longtext') return <Text style={[styles.translation, { color: tone.text }]}>{content}</Text>;
  const md = (msg.msg as { type?: unknown } | null)?.type === 'md';
  return <RichBlocks blocks={textBlocks(content, md, ctx.body)} tone={tone} />;
}

function ReplyQuote({ reply, tone }: { reply: ReplyInfo; tone: BubbleTone }) {
  const ctx = useRowContext();
  const name = useName(reply.userid, reply.name);
  return (
    <Touchable
      onPress={() => ctx.onQuote(reply.id)}
      accessibilityRole="button"
      style={({ pressed }) => [styles.reply, { backgroundColor: tone.overlay, borderLeftColor: tone.accent }, pressed && styles.pressed]}
    >
      <View style={styles.replyText}>
        <Text style={[styles.replyName, { color: tone.accent }]} numberOfLines={1}>{name}</Text>
        <Text style={[styles.replyBody, { color: tone.text }]} numberOfLines={1}>
          <PreviewText preview={reply.preview} />
        </Text>
      </View>
      {!!reply.thumb && <Image source={reply.thumb} style={styles.replyThumb} contentFit="cover" recyclingKey={reply.thumb} cachePolicy="memory-disk" />}
    </Touchable>
  );
}

/** 时间行（与旧前端同序）：标注、待办、已编辑、时间、已读；onMedia 时是图片上的浮层 */
function Meta({ msg, own, tone, onMedia }: { msg: Msg; own: boolean; tone: BubbleTone; onMedia: boolean }) {
  const t = useT();
  const ctx = useRowContext();
  const { theme } = useUnistyles();
  const color = onMedia ? theme.colors.onMedia : tone.muted;
  const { tag, todo, modify, percentage } = msgExtra(msg);
  return (
    <View style={[styles.meta, onMedia && styles.metaOnMedia]}>
      {!!tag && <Icon icon={Bookmark} color={color} size={12} />}
      {!!todo && <TodoMark id={msg.id} color={color} />}
      {!!modify && <Icon icon={Pencil} color={color} size={12} />}
      <View style={styles.metaTime}>
        <Text style={[styles.time, { color }]} allowFontScaling={false}>{formatTime(toUnix(msg.created_at) * 1000)}</Text>
        {own &&
          (ctx.group ? (
            <Touchable
              accessibilityRole="button"
              accessibilityLabel={t('messenger:read.title')}
              hitSlop={theme.spacing.md}
              onPress={() => ctx.onReadList(msg.id)}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <ReadMark group percent={percentage ?? 0} color={color} />
            </Touchable>
          ) : (
            <ReadMark group={false} percent={percentage ?? 0} color={color} />
          ))}
      </View>
    </View>
  );
}

const READ_ICON = 14;
const RING_SIZE = 12;
const RING_STROKE = 2;
const RING_START = { transform: [{ rotate: '-90deg' }] };

/** 自己消息的已读标记：单聊未读一个勾、已读两个勾；群聊是已读比例圆环，全部已读换成双勾 */
function ReadMark({ group, percent, color }: { group: boolean; percent: number; color: string }) {
  if (!group || percent >= 100) return <Icon icon={percent > 0 ? CheckCheck : Check} color={color} size={READ_ICON} />;
  const center = RING_SIZE / 2;
  const r = center - RING_STROKE / 2;
  const length = 2 * Math.PI * r;
  return (
    // 进度从 12 点方向开始：整个图转 -90°（SVG 的 rotation / origin 在 Web 上会变成非法 DOM 属性）
    <Svg width={RING_SIZE} height={RING_SIZE} style={RING_START}>
      <Circle cx={center} cy={center} r={r} stroke={color} strokeOpacity={0.3} strokeWidth={RING_STROKE} fill="none" />
      <Circle
        cx={center}
        cy={center}
        r={r}
        stroke={color}
        strokeWidth={RING_STROKE}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${(length * percent) / 100} ${length}`}
      />
    </Svg>
  );
}

/** 发送队列里的文本：发送中压暗，失败时下方一行红字，点了选择重新发送或删除 */
function PendingRow({ info, item }: { info: MessageRenderInfo<RowData>; item: OutboxItem }) {
  const ctx = useRowContext();
  const t = useT();
  const tone = ctx.tones.own;
  const items = ctx.pendingMenu(item);
  const { body } = msgContent(pendingMsg(item, ctx.body.userId), ctx.body);
  const failed = item.state === 'failed';
  return (
    <Dimmed on={!failed}>
      <BubbleFrame info={info} touch={{ menu: items.length > 0 ? () => items : undefined }}>
        <MessageBody body={body} tone={tone} />
        <PendingMeta at={item.queuedAt} tone={tone} />
      </BubbleFrame>
      {failed && <FailedNote items={items} error={item.error || t('messenger:chat.sendFailed')} />}
    </Dimmed>
  );
}

/** 发送失败的提示：气泡下方一行红字，点了选择重新发送或删除 */
function FailedNote({ items, error }: { items: readonly MenuEntry[]; error: string }) {
  const { theme } = useUnistyles();
  return (
    <Menu items={items} accessibilityLabel={error} style={styles.failedRow}>
      <Icon icon={CircleAlert} color={theme.colors.danger} size={14} />
      <Text style={styles.failedText}>{error}</Text>
    </Menu>
  );
}

/** 时间行的占位：发送中按未读画，发出后时间行宽度不跳 */
function PendingMeta({ at, tone }: { at: number; tone: BubbleTone }) {
  const ctx = useRowContext();
  return (
    <View style={styles.meta}>
      <View style={styles.metaTime}>
        <Text style={[styles.time, { color: tone.muted }]} allowFontScaling={false}>{formatTime(at)}</Text>
        <ReadMark group={ctx.group} percent={0} color={tone.muted} />
      </View>
    </View>
  );
}

const extOf = (name: string) => (name.includes('.') ? name.split('.').pop()! : '');

/**
 * 发送中的文件：图片、视频按本地内容占位，中间是进度环（点了取消发送）；其他文件是文件卡片，色块上是进度环。
 * 失败时下方一行红字，点了重新发送或删除
 */
function UploadRow({ info, item }: { info: MessageRenderInfo<RowData>; item: UploadItem }) {
  const ctx = useRowContext();
  const t = useT();
  const { theme } = useUnistyles();
  const items = ctx.uploadMenu(item);
  const failed = item.state === 'failed';
  const { file } = item;
  const touch: Touch = { menu: () => items };
  return (
    <View>
      {item.duration !== undefined ? (
        // 语音不显示进度（文件小，随消息一起发出）
        <BubbleFrame info={info} touch={touch}>
          <RecordBody url={file.uri} duration={item.duration} text="" tone={ctx.tones.own} />
          <PendingMeta at={item.queuedAt} tone={ctx.tones.own} />
        </BubbleFrame>
      ) : file.media ? (
        <BubbleFrame info={info} variant="bare" touch={touch}>
          <LocalMedia file={file}>{!failed && <UploadProgress localId={item.localId} size={theme.size.mediaPlay} scrim />}</LocalMedia>
        </BubbleFrame>
      ) : (
        <BubbleFrame info={info} touch={touch}>
          <FileCard
            name={file.name}
            ext={extOf(file.name)}
            size={file.size}
            tone={ctx.tones.own}
            tile={failed ? undefined : <UploadProgress localId={item.localId} size={theme.size.fileTile} />}
          />
          <PendingMeta at={item.queuedAt} tone={ctx.tones.own} />
        </BubbleFrame>
      )}
      {failed && <FailedNote items={items} error={item.error || t('messenger:chat.uploadFailed')} />}
    </View>
  );
}

const PROGRESS_STROKE = 3;

/** 上传进度环，中间的叉取消发送；只有这一块订阅进度，进度变化不重画整行 */
function UploadProgress({ localId, size, scrim }: { localId: string; size: number; scrim?: boolean }) {
  const t = useT();
  const { theme } = useUnistyles();
  const messenger = useMessenger();
  const ratio = useStore(messenger!.uploadProgress, (s) => s[localId] ?? 0);
  const center = size / 2;
  const r = center - PROGRESS_STROKE;
  const length = 2 * Math.PI * r;
  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={t('messenger:chat.cancelSend')}
      onPress={() => messenger?.discardUpload(localId)}
      style={({ pressed }) => [styles.progress(size), scrim && styles.progressScrim, pressed && styles.pressed]}
    >
      <Svg width={size} height={size} style={[StyleSheet.absoluteFill, RING_START]}>
        <Circle cx={center} cy={center} r={r} stroke={theme.palette.tileProgress} strokeWidth={PROGRESS_STROKE} fill="none" />
        <Circle
          cx={center}
          cy={center}
          r={r}
          stroke={theme.colors.onMedia}
          strokeWidth={PROGRESS_STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${length * ratio} ${length}`}
        />
      </Svg>
      <Icon icon={X} color={theme.colors.onMedia} size={theme.size.iconSmall} />
    </Touchable>
  );
}

/** 待发送项按服务器消息的样子解析正文（回复引用由服务器补齐，发送中不显示） */
function pendingMsg(item: OutboxItem, userId: number): Msg {
  return { id: 0, dialog_id: item.dialog_id, userid: userId, type: 'text', msg: { text: item.text, type: item.md ? 'md' : undefined }, created_at: '' };
}

/** 系统消息：居中一行，用户换成昵称 */
function SystemRow({ msg }: { msg: Msg }) {
  const ctx = useRowContext();
  const t = useT();
  const { body } = msgContent(msg, ctx.body);
  if (body.kind !== 'system') return null;
  return (
    <View style={styles.system}>
      <Text style={styles.systemText}>
        {body.parts.map((part, index) => {
          const space = index > 0 ? ' ' : '';
          if ('userid' in part) return <SystemUser key={index} userid={part.userid} prefix={space} />;
          if ('label' in part) return space + t(SYSTEM_LABELS[part.label]);
          // 引号同旧版：英文双引号
          if ('preview' in part) return <Text key={index}>{space}{'"'}<PreviewText preview={part.preview} />{'"'}</Text>;
          return space + part.text;
        })}
      </Text>
    </View>
  );
}

function SystemUser({ userid, prefix }: { userid: number; prefix: string }) {
  const name = useName(userid);
  return <Text style={styles.systemUser}>{prefix}{name}</Text>;
}

/** 自己刚撤回的文本：提示加「重新编辑」 */
function WithdrawnRow({ item }: { item: WithdrawnMsg }) {
  const ctx = useRowContext();
  const t = useT();
  return (
    <View style={styles.system}>
      <Text style={styles.systemText}>
        {t('messenger:system.withdrawSelf')}
        {ctx.onReEdit && (
          <>
            {'  '}
            <Text style={styles.link} onPress={() => ctx.onReEdit?.(item)}>{t('messenger:chat.reEdit')}</Text>
          </>
        )}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  caption: { ...theme.typography.caption },
  pressed: { opacity: theme.opacity.pressedIcon },
  selectRow: { flexDirection: 'row', alignItems: 'center' },
  selectRowChecked: { backgroundColor: theme.colors.rowHighlight },
  // 选择模式下消息本身不接收点按，整行交给外层
  selectBody: { flex: 1, pointerEvents: 'none' },
  row: { paddingHorizontal: theme.spacing.page, flexDirection: 'row', alignItems: 'flex-end' },
  // 气泡最宽到对侧留出固定空白：有没有头像列，对侧空白都一样
  rowOwn: { justifyContent: 'flex-end', paddingLeft: theme.spacing.page + theme.size.bubbleFarGap },
  rowPeer: { justifyContent: 'flex-start', paddingRight: theme.spacing.page + theme.size.bubbleFarGap },
  leading: { width: theme.size.avatar.md, marginRight: theme.spacing.sm },
  bubble: { flexShrink: 1, borderRadius: theme.radius.bubble, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm },
  bubbleColor: (own: boolean, joinOlder: boolean, joinNewer: boolean) => {
    const top = joinOlder ? theme.radius.bubbleTight : theme.radius.bubble;
    const bottom = joinNewer ? theme.radius.bubbleTight : theme.radius.bubble;
    return own
      ? { backgroundColor: theme.colors.bubbleOut, borderTopRightRadius: top, borderBottomRightRadius: bottom }
      : { backgroundColor: theme.colors.bubbleIn, borderTopLeftRadius: top, borderBottomLeftRadius: bottom };
  },
  bubbleMedia: { padding: theme.spacing.xs },
  bubbleBare: (own: boolean) => ({ padding: 0, alignItems: own ? 'flex-end' : 'flex-start' }),
  header: { gap: theme.spacing.xs, marginBottom: theme.spacing.xs },
  mediaPad: { paddingHorizontal: theme.spacing.sm, paddingTop: theme.spacing.xs },
  senderName: { ...theme.typography.caption, color: theme.colors.primaryText },
  forward: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: theme.spacing.xs },
  reply: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, borderLeftWidth: 3, borderRadius: theme.radius.bubbleTight,
    paddingLeft: theme.spacing.sm, paddingRight: theme.spacing.xs, paddingVertical: theme.spacing.xs,
  },
  replyText: { flexShrink: 1, flexGrow: 1 },
  replyName: { ...theme.typography.caption, fontWeight: '600' },
  replyBody: { ...theme.typography.footnote },
  replyThumb: { width: theme.size.quoteThumb, height: theme.size.quoteThumb, borderRadius: theme.radius.bubbleTight },
  footer: { gap: theme.spacing.xs, marginTop: theme.spacing.xs },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: theme.spacing.sm },
  busy: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  translation: { ...theme.typography.body },
  replyNum: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, alignSelf: 'flex-start' },
  reactions: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs },
  reaction: {
    flexDirection: 'row', alignItems: 'center', gap: 2, height: theme.size.reaction,
    borderRadius: theme.radius.pill, paddingHorizontal: theme.spacing.sm,
  },
  reactionActive: (pressed: boolean) => ({ opacity: pressed ? theme.opacity.pressedIcon : theme.opacity.pressedPrimary }),
  reactionSymbol: { ...theme.typography.subhead },
  reactionCount: { ...theme.typography.caption2 },
  reactionCountMine: { color: theme.colors.onPrimary },
  meta: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: 6, marginTop: 2 },
  /** 时间与已读状态贴近一些，算一组 */
  metaTime: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  metaOnMedia: { borderRadius: theme.radius.pill, paddingHorizontal: 6, paddingVertical: 2, marginTop: 0, backgroundColor: theme.colors.mediaScrim },
  time: { ...theme.typography.caption2 },
  mediaMeta: { position: 'absolute', right: theme.spacing.sm, bottom: theme.spacing.sm },
  stickerMeta: { marginTop: theme.spacing.xs },
  failedRow: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.page, paddingVertical: theme.spacing.xs,
  },
  failedText: { ...theme.typography.caption, color: theme.colors.danger },
  progress: (size: number) => ({ width: size, height: size, borderRadius: theme.radius.pill, alignItems: 'center', justifyContent: 'center' }),
  progressScrim: { backgroundColor: theme.colors.mediaScrim },
  system: { alignSelf: 'center', maxWidth: '80%', paddingHorizontal: theme.spacing.page },
  systemText: { ...theme.typography.caption, color: theme.colors.text3, textAlign: 'center' },
  systemUser: { color: theme.colors.text2 },
  link: { color: theme.colors.link },
  newDivider: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingHorizontal: theme.spacing.page, paddingTop: theme.spacing.md },
  newDividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.separator },
  newDividerText: { ...theme.typography.caption, color: theme.colors.text3 },
}));
