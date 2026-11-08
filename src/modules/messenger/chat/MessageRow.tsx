import { Image } from 'expo-image';
import { Bookmark, Check, CheckCheck, CircleAlert, Forward, ListTodo, MessageSquareText, Pencil } from 'lucide-react-native';
import { createContext, memo, useContext, useEffect, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import type { Msg } from '../../../sync/api/dialog';
import { toUnix, type OutboxItem, type WithdrawnMsg } from '../../../sync/messenger';
import { msgContent, reactions, type BodyContext, type MsgBody, type ReplyInfo, type SystemLabel } from '../../../sync/messenger/body';
import { UserAvatar } from '../../../ui/Avatar';
import { RowHighlight, type MessageRenderInfo } from '../../../ui/chat';
import { Icon } from '../../../ui/Icon';
import { Menu, type MenuEntry } from '../../../ui/popover';
import { Touchable } from '../../../ui/Touchable';
import { useUser } from '../hooks';
import { PreviewText } from '../PreviewText';
import { chained, isSystemRow, type ChatRow, type RowData } from './chatModel';
import { isMediaBody, isStickerBody, MediaBody, MessageBody, StickerBody } from './MessageBody';
import type { BubbleTone } from './RichText';

/**
 * 聊天列表的一行：气泡（文字、图片、文件、语音）、系统提示、发送中 / 失败、撤回占位。
 * 行组件 memo，数据没变的行不重画；行里要用的回调都在 RowContext 里，聊天页给的是稳定对象
 */

export interface RowContext {
  group: boolean;
  body: BodyContext;
  tones: { own: BubbleTone; peer: BubbleTone };
  /** 打开会话时的第一条未读，上方画「以下为新消息」 */
  newFrom: number;
  /** 长按 / 右键菜单 */
  menu: (msg: Msg, body: MsgBody, own: boolean) => MenuEntry[];
  pendingMenu: (item: OutboxItem) => MenuEntry[];
  /** 点气泡：打开图片、文件，播放语音，查看全文 */
  onOpen: (msg: Msg, body: MsgBody) => void;
  /** 点回应胶囊（自己回应过的再点即取消） */
  onReact: (msg: Msg, symbol: string) => void;
  /** 点回复引用：跳到原消息 */
  onQuote: (id: number) => void;
  onReEdit: (item: WithdrawnMsg) => void;
}

export const RowContextValue = createContext<RowContext | null>(null);

const useRowContext = () => useContext(RowContextValue)!;

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

/** 消息里接口没有声明、显示要用的字段 */
interface MsgExtra {
  percentage?: number;
  reply_num?: number;
  tag?: number;
  todo?: number;
  modify?: number;
}
const extra = (msg: Msg) => msg as Msg & MsgExtra;

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
        {data.kind === 'msg' && (isSystemRow(message) ? <SystemRow msg={data.msg} /> : <MsgRow info={info} msg={data.msg} />)}
        {data.kind === 'pending' && <PendingRow info={info} item={data.item} />}
        {data.kind === 'withdrawn' && <WithdrawnRow item={data.item} />}
      </View>
    </View>
  );
});

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

/**
 * 气泡外框：左右对齐、连续消息圆角收紧、底色；对方在群里时左侧是头像列（连续消息只在最后一条显示头像）。
 * 长按（App）/ 右键（Web）出菜单
 */
function BubbleFrame({ info, variant, leading, items, onPress, children }: {
  info: MessageRenderInfo<RowData>;
  /** media：图片视频（内边距收窄）；bare：不套气泡（表情） */
  variant?: 'media' | 'bare';
  leading?: ReactNode;
  items: readonly MenuEntry[];
  onPress?: () => void;
  children: ReactNode;
}) {
  const { message, older, newer, isOwn } = info;
  const joinOlder = chained(message, older);
  const joinNewer = chained(message, newer);
  return (
    <View style={[styles.row, isOwn ? styles.rowOwn : styles.rowPeer]}>
      {leading !== undefined && <View style={styles.leading}>{joinNewer ? null : leading}</View>}
      <Menu
        items={items}
        trigger="context"
        onPress={onPress}
        style={[
          styles.bubble,
          variant === 'bare' ? styles.bubbleBare(isOwn) : styles.bubbleColor(isOwn, joinOlder, joinNewer),
          variant === 'media' && styles.bubbleMedia,
        ]}
      >
        {children}
      </Menu>
    </View>
  );
}

function MsgRow({ info, msg }: { info: MessageRenderInfo<RowData>; msg: Msg }) {
  const ctx = useRowContext();
  const t = useT();
  const { isOwn, message, older } = info;
  const tone = isOwn ? ctx.tones.own : ctx.tones.peer;
  const { body, reply, forward } = msgContent(msg, ctx.body);
  const items = ctx.menu(msg, body, isOwn);
  const name = useName(msg.userid);
  const user = useUser(msg.userid);
  const forwardName = useName(forward?.userid ?? 0);
  const peerInGroup = ctx.group && !isOwn;
  const showName = peerInGroup && !chained(message, older) && !!name;
  const leading = peerInGroup ? <UserAvatar uri={user?.userimg} userid={msg.userid} name={name} bot={!!user?.bot} size={32} /> : undefined;
  const replyNum = extra(msg).reply_num ?? 0;
  const list = reactions(msg, ctx.body.userId);

  const hasHeader = showName || !!forward || !!reply;
  const hasFooter = list.length > 0 || replyNum > 0;
  const onPress = OPENABLE.has(body.kind) || (body.kind === 'rich' && body.long) ? () => ctx.onOpen(msg, body) : undefined;
  const meta = (onMedia: boolean) => <Meta msg={msg} own={isOwn} tone={tone} onMedia={onMedia} />;

  // 表情：不套气泡，时间在下方
  if (isStickerBody(body) && !hasHeader && !hasFooter) {
    return (
      <BubbleFrame info={info} variant="bare" leading={leading} items={items}>
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
            <Touchable
              key={reaction.symbol}
              onPress={() => ctx.onReact(msg, reaction.symbol)}
              accessibilityRole="button"
              style={({ pressed, hovered }) => [
                styles.reaction,
                { backgroundColor: reaction.mine ? tone.accent : tone.overlay },
                (pressed || hovered) && styles.reactionActive(pressed),
              ]}
            >
              <Text style={styles.reactionSymbol} allowFontScaling={false}>{reaction.symbol}</Text>
              <Text style={[styles.reactionCount, reaction.mine ? styles.reactionCountMine : { color: tone.text }]}>{reaction.count}</Text>
            </Touchable>
          ))}
        </View>
      )}
    </View>
  );

  if (media) {
    // 没有底部内容时时间浮在图片上，否则放在底部内容的右下角；只有图片时不套气泡底色
    return (
      <BubbleFrame info={info} variant={hasHeader || hasFooter ? 'media' : 'bare'} leading={leading} items={items} onPress={onPress}>
        {header}
        <MediaBody body={body} overlay={!hasFooter && <View style={styles.mediaMeta}>{meta(true)}</View>} />
        {footer}
        {hasFooter && <View style={styles.mediaPad}>{meta(false)}</View>}
      </BubbleFrame>
    );
  }

  return (
    <BubbleFrame info={info} leading={leading} items={items} onPress={onPress}>
      {header}
      <MessageBody body={body} tone={tone} unplayed={!isOwn && !!msg.dot} />
      {footer}
      {meta(false)}
    </BubbleFrame>
  );
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
  const ctx = useRowContext();
  const { theme } = useUnistyles();
  const color = onMedia ? theme.colors.onMedia : tone.muted;
  const { tag, todo, modify, percentage } = extra(msg);
  return (
    <View style={[styles.meta, onMedia && styles.metaOnMedia]}>
      {!!tag && <Icon icon={Bookmark} color={color} size={12} />}
      {!!todo && <Icon icon={ListTodo} color={color} size={12} />}
      {!!modify && <Icon icon={Pencil} color={color} size={12} />}
      <View style={styles.metaTime}>
        <Text style={[styles.time, { color }]} allowFontScaling={false}>{formatTime(toUnix(msg.created_at) * 1000)}</Text>
        {own && <ReadMark group={ctx.group} percent={percentage ?? 0} color={color} />}
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
  const { theme } = useUnistyles();
  const tone = ctx.tones.own;
  const items = ctx.pendingMenu(item);
  const { body } = msgContent(pendingMsg(item, ctx.body.userId), ctx.body);
  const failed = item.state === 'failed';
  return (
    <Dimmed on={!failed}>
      <BubbleFrame info={info} items={items}>
        <MessageBody body={body} tone={tone} />
        <View style={styles.meta}>
          <View style={styles.metaTime}>
            <Text style={[styles.time, { color: tone.muted }]} allowFontScaling={false}>{formatTime(item.queuedAt)}</Text>
            {/* 发送中按未读占位，发出后时间行宽度不跳 */}
            <ReadMark group={ctx.group} percent={0} color={tone.muted} />
          </View>
        </View>
      </BubbleFrame>
      {failed && (
        <Menu items={items} accessibilityLabel={t('messenger:chat.sendFailed')} style={styles.failedRow}>
          <Icon icon={CircleAlert} color={theme.colors.danger} size={14} />
          <Text style={styles.failedText}>{item.error || t('messenger:chat.sendFailed')}</Text>
        </Menu>
      )}
    </Dimmed>
  );
}

/** 待发送项按服务器消息的样子解析正文（回复引用由服务器补齐，发送中不显示） */
function pendingMsg(item: OutboxItem, userId: number): Msg {
  return { id: 0, dialog_id: item.dialog_id, userid: userId, type: 'text', msg: { text: item.text }, created_at: '' };
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
          if ('preview' in part) return <Text key={index}>{space}「<PreviewText preview={part.preview} />」</Text>;
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
        {'  '}
        <Text style={styles.link} onPress={() => ctx.onReEdit(item)}>{t('messenger:chat.reEdit')}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  caption: { ...theme.typography.caption },
  pressed: { opacity: theme.opacity.pressedIcon },
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
  system: { alignSelf: 'center', maxWidth: '80%', paddingHorizontal: theme.spacing.page },
  systemText: { ...theme.typography.caption, color: theme.colors.text3, textAlign: 'center' },
  systemUser: { color: theme.colors.text2 },
  link: { color: theme.colors.link },
  newDivider: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingHorizontal: theme.spacing.page, paddingTop: theme.spacing.md },
  newDividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.separator },
  newDividerText: { ...theme.typography.caption, color: theme.colors.text3 },
}));
