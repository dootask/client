import { Image } from 'expo-image';
import { Bookmark, Forward, MessageSquareText, Pencil } from 'lucide-react-native';
import { type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import type { Msg } from '../../../sync/api/dialog';
import { toUnix, type OutboxItem, type UploadItem } from '../../../sync/messenger';
import { msgContent, reactions, type ReplyInfo } from '../../../sync/messenger/body';
import { UserAvatar } from '../../../ui/Avatar';
import { type MessageRenderInfo } from '../../../ui/chat';
import { Icon } from '../../../ui/Icon';
import { Touchable } from '../../../ui/Touchable';
import { useUser } from '../hooks';
import { PreviewText } from '../PreviewText';
import { BubbleTouch } from './BubbleTouch';
import { chained, type RowData } from './chatModel';
import { LIKE } from './emoji';
import { ReactionTip } from './ReactionTip';
import { FileCard, isMediaBody, isStickerBody, LocalMedia, MediaBody, MessageBody, RecordBody, StickerBody } from './MessageBody';
import { msgExtra } from './msgExtra';
import { type BubbleTone } from './RichText';
import { Dimmed, FailedNote, OPENABLE, ReadMark, TodoMark, type Touch, Understanding, UploadProgress, pendingMsg, useName, useRowContext } from './rowParts';

/** 消息内时间：本地时区 HH:mm */
function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

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

export function MsgRow({ info, msg }: { info: MessageRenderInfo<RowData>; msg: Msg }) {
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

/** 发送队列里的文本：发送中压暗，失败时下方一行红字，点了选择重新发送或删除 */
export function PendingRow({ info, item }: { info: MessageRenderInfo<RowData>; item: OutboxItem }) {
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
export function UploadRow({ info, item }: { info: MessageRenderInfo<RowData>; item: UploadItem }) {
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
}));
