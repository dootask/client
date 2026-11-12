import { CircleAlert, ClipboardCheck, MessageCircle, PencilLine, Tag } from 'lucide-react-native';
import { useContext, useState, type ReactNode } from 'react';
import { ActivityIndicator, Text, useWindowDimensions, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { joinNames, useLanguage, useT } from '../../../i18n';
import type { Msg } from '../../../sync/api/dialog';
import { type OutboxItem, type UploadItem } from '../../../sync/messenger';
import { msgContent, reactions, type MsgBody, type Reaction, type ReplyInfo } from '../../../sync/messenger/body';
import { UserAvatar } from '../../../ui/Avatar';
import { type MessageRenderInfo } from '../../../ui/chat';
import { Icon, type LucideIcon } from '../../../ui/Icon';
import { Menu, type MenuEntry } from '../../../ui/popover';
import { Touchable } from '../../../ui/Touchable';
import { useToday } from '../clock';
import { useNicknames, useStreamingMsg, useUser } from '../hooks';
import { listTimeText } from '../listModel';
import { PreviewText } from '../PreviewText';
import { BubbleTouch } from './BubbleTouch';
import { type RowData } from './chatModel';
import { LIKE } from './emoji';
import type { MergeRowProps } from './mergeDetail';
import { CardHostContext } from './cards/cardMsg';
import { FileCard, isStickerBody, LocalMedia, MessageBody, RecordBody, StickerBody } from './MessageBody';
import { msgExtra } from './msgExtra';
import { Dimmed, MyTodosContext, OPENABLE, ReadMark, SelectCheckContext, type Touch, Understanding, UploadProgress, pendingMsg, useName, useRowContext } from './rowParts';

/*
 * 旧版网页的消息行：头像在两侧（自己的在右），群里名字在气泡上方；
 * 气泡下方一行是回复数、标注、待办、已编辑、时间、已读（同旧版 .dialog-foot 的顺序）
 */

/** 文字类消息最宽占一行的 70%（旧版 .dialog-view.text） */
const TEXT_KINDS = new Set<MsgBody['kind']>(['rich', 'ai', 'record', 'file', 'unknown']);

/** 正文和图片在气泡内边距外再缩进一点（旧版 .content-text），文件卡等不缩 */
const CONTENT_KINDS = new Set<MsgBody['kind']>(['rich', 'ai', 'image', 'video', 'vote', 'wordChain']);

/** 头像、名字（群里、合并转发详情里有）、气泡、底部一行的外框；userid 是头像那个人 */
function MsgFrame({ own, userid, name: showName, text, foot, children }: { own: boolean; userid: number; name: boolean; text: boolean; foot: ReactNode; children: ReactNode }) {
  const { theme } = useUnistyles();
  const user = useUser(userid);
  const name = useName(userid);
  const check = useContext(SelectCheckContext);
  return (
    <View testID={own ? 'msg-row-own' : 'msg-row'} style={styles.row(own)}>
      {check}
      <View style={styles.avatar}>
        <UserAvatar uri={user?.userimg} userid={userid} name={name} bot={!!user?.bot} size={theme.size.avatar.msg} />
      </View>
      <View style={styles.view(own, text)}>
        {showName && <Text testID="msg-name" style={styles.name} numberOfLines={1}>{name}</Text>}
        {children}
        <View testID="msg-foot" style={styles.foot}>{foot}</View>
      </View>
    </View>
  );
}

export function MsgRow({ info, msg: stored }: { info: MessageRenderInfo<RowData>; msg: Msg }) {
  const msg = useStreamingMsg(stored);
  const ctx = useRowContext();
  const { isOwn } = info;
  const tone = isOwn ? ctx.tones.own : ctx.tones.peer;
  const { body, reply, forward } = msgContent(msg, ctx.body);
  const list = reactions(msg, ctx.body.userId);
  const onPress = OPENABLE.has(body.kind) ? () => ctx.onOpen(msg, body) : undefined;
  const touch: Touch = {
    onPress,
    menu: () => ctx.menu(msg, body, isOwn),
    onDoubleTap: () => ctx.onReact(msg, LIKE),
    onReact: (symbol) => ctx.onReact(msg, symbol),
    onHover: () => ctx.onHover(msg),
  };
  // 只有一个表情时不套气泡（旧版 .dialog-head.transparent）
  const sticker = isStickerBody(body) && !reply && !forward && list.length === 0;
  return (
    <MsgFrame own={isOwn} userid={msg.userid} name={ctx.group} text={TEXT_KINDS.has(body.kind)} foot={<Foot msg={msg} own={isOwn} />}>
      <BubbleTouch rowStyle={styles.bubbleRow} bubbleStyle={sticker ? styles.bare : styles.bubble(isOwn)} {...touch}>
        {reply && <ReplyQuote reply={reply} own={isOwn} />}
        {forward && <ForwardQuote userid={forward.userid} own={isOwn} />}
        {sticker ? (
          <StickerBody body={body} />
        ) : (
          <View testID="msg-content" style={CONTENT_KINDS.has(body.kind) && styles.content}>
            <CardHostContext.Provider value={{ msg, open: () => ctx.onOpen(msg, body) }}>
              <MessageBody body={body} tone={tone} unplayed={!isOwn && !!msg.dot} msgId={msg.id} />
            </CardHostContext.Provider>
          </View>
        )}
        <Understanding msg={msg} tone={tone} />
        {list.length > 0 && <Reactions msg={msg} list={list} own={isOwn} />}
      </BubbleTouch>
    </MsgFrame>
  );
}

/** 引用：左边一道竖线，名字一行、摘要最多两行；点了跳到原消息 */
function ReplyQuote({ reply, own }: { reply: ReplyInfo; own: boolean }) {
  const ctx = useRowContext();
  const name = useName(reply.userid, reply.name);
  return (
    <Touchable testID="msg-reply" onPress={() => ctx.onQuote(reply.id)} accessibilityRole="button" style={styles.quote}>
      <View style={styles.quoteBar(own)} />
      <Text style={styles.quoteName(own)} numberOfLines={1}>{name}</Text>
      <Text style={styles.quoteDesc(own)} numberOfLines={2}>
        <PreviewText preview={reply.preview} />
      </Text>
    </Touchable>
  );
}

/** 转发：同引用的样式，只有原发送人的名字 */
function ForwardQuote({ userid, own }: { userid: number; own: boolean }) {
  const name = useName(userid);
  return (
    <View style={styles.quote}>
      <View style={styles.quoteBar(own)} />
      <Text style={styles.quoteName(own)} numberOfLines={1}>{name}</Text>
    </View>
  );
}

/** 表情回应：表情后面列出回应的人（我排第一），列不下的写「+N位」；点表情回应 / 取消，点名字看详情 */
function Reactions({ msg, list, own }: { msg: Msg; list: readonly Reaction[]; own: boolean }) {
  const ctx = useRowContext();
  // 同旧版：按窗口宽度列 2～6 个名字
  const { width } = useWindowDimensions();
  const max = Math.min(6, Math.max(2, Math.floor((width - 180) / 52)));
  return (
    <View style={styles.reactions}>
      {list.map((reaction) => (
        <View key={reaction.symbol} testID="msg-reaction" style={styles.reaction(own, reaction.mine)}>
          <Touchable accessibilityRole="button" accessibilityLabel={reaction.symbol} onPress={() => ctx.onReact(msg, reaction.symbol)}>
            <Text style={styles.reactionSymbol} allowFontScaling={false}>{reaction.symbol}</Text>
          </Touchable>
          <Touchable accessibilityRole="button" onPress={() => ctx.onReactionList(list, reaction.symbol)} style={styles.reactionUsers}>
            <ReactionNames userids={reaction.userids} max={max} own={own} />
          </Touchable>
        </View>
      ))}
    </View>
  );
}

function ReactionNames({ userids, max, own }: { userids: readonly number[]; max: number; own: boolean }) {
  const t = useT();
  const language = useLanguage();
  const ctx = useRowContext();
  const me = ctx.body.userId;
  const sorted = userids.includes(me) ? [me, ...userids.filter((id) => id !== me)] : userids;
  const names = useNicknames(sorted.slice(0, max));
  const rest = userids.length - max;
  return (
    <Text style={styles.reactionNames(own)} numberOfLines={1}>
      {joinNames(names, language, rest > 0 ? t('messenger:reaction.more', { n: rest }) : undefined)}
    </Text>
  );
}

/** 气泡下方一行（同旧版顺序）：回复数、标注、待办、已编辑、时间（点了切换完整时间）、自己的消息加已读 */
function Foot({ msg, own }: { msg: Msg; own: boolean }) {
  const t = useT();
  const ctx = useRowContext();
  const { theme } = useUnistyles();
  const { tag, todo, todo_done: todoDone, modify, percentage, reply_num: replyNum } = msgExtra(msg);
  const mine = useContext(MyTodosContext)?.has(msg.id);
  const readSize = { icon: theme.size.msgReadIcon, ring: theme.size.msgReadRing };
  return (
    <>
      {!!replyNum && (
        <View style={styles.footItem}>
          <Icon icon={MessageCircle} color={theme.colors.primary} size={theme.size.msgFootIcon} />
          <Text style={styles.replyNum}>{t('messenger:chat.replies', { n: replyNum })}</Text>
        </View>
      )}
      {!!tag && <FootIcon icon={Tag} />}
      {!!todo && <FootIcon icon={ClipboardCheck} color={mine ? theme.colors.warning : todoDone ? theme.colors.primary : undefined} />}
      {!!modify && <FootIcon icon={PencilLine} />}
      <FootTime createdAt={msg.created_at} />
      {own && (
        <View style={styles.read}>
          {ctx.group ? (
            <Touchable accessibilityRole="button" accessibilityLabel={t('messenger:read.title')} onPress={() => ctx.onReadList(msg.id)}>
              <ReadMark group percent={percentage ?? 0} color={theme.colors.primary} size={readSize} />
            </Touchable>
          ) : (
            <ReadMark group={false} percent={percentage ?? 0} color={theme.colors.primary} size={readSize} />
          )}
        </View>
      )}
    </>
  );
}

function FootIcon({ icon, color }: { icon: LucideIcon; color?: string }) {
  const { theme } = useUnistyles();
  return (
    <View style={styles.footItem}>
      <Icon icon={icon} color={color ?? theme.colors.pageText} size={theme.size.msgFootIcon} />
    </View>
  );
}

/**
 * 合并转发详情里的一条（旧版网页 .dialog-wrapper.inde-list）：头像、名字、气泡同聊天行，底部只有时间；
 * 只读，点气泡打开图片、文件等，卡片上的入口（嵌套的合并转发标题）同点气泡
 */
export function MergeRow({ msg, body, own, tones, onOpen }: MergeRowProps) {
  const sticker = isStickerBody(body);
  const onPress = OPENABLE.has(body.kind) ? onOpen : undefined;
  return (
    <MsgFrame own={own} userid={msg.userid} name text={TEXT_KINDS.has(body.kind)} foot={<FootTime createdAt={msg.created_at} />}>
      <BubbleTouch rowStyle={styles.bubbleRow} bubbleStyle={sticker ? styles.bare : styles.bubble(own)} onPress={onPress}>
        {sticker ? (
          <StickerBody body={body} />
        ) : (
          <View style={CONTENT_KINDS.has(body.kind) && styles.content}>
            <CardHostContext.Provider value={{ msg: null, open: onOpen }}>
              <MessageBody body={body} tone={own ? tones.own : tones.peer} msgId={msg.id} />
            </CardHostContext.Provider>
          </View>
        )}
      </BubbleTouch>
    </MsgFrame>
  );
}

/** 时间同旧版 $A.timeFormat（今天 HH:mm、昨天 HH:mm、今年 MM-DD、更早 YYYY-MM-DD），点了换成完整时间 */
function FootTime({ createdAt }: { createdAt: string }) {
  const t = useT();
  const today = useToday();
  const [full, setFull] = useState(false);
  return (
    <Text testID="msg-time" style={styles.time} onPress={() => setFull((v) => !v)}>
      {full ? createdAt : listTimeText(createdAt, today, t('messenger:yesterday'))}
    </Text>
  );
}

/** 发送中转圈，失败是红色感叹号，点了选择重新发送或删除 */
function PendingFoot({ failed, items }: { failed: boolean; items: readonly MenuEntry[] }) {
  const t = useT();
  const { theme } = useUnistyles();
  if (!failed) return <ActivityIndicator size={theme.size.msgFootIcon} color={theme.colors.msgTime} />;
  return (
    <Menu items={items} accessibilityLabel={t('messenger:chat.sendFailed')} style={styles.footItem}>
      <Icon icon={CircleAlert} color={theme.colors.badge} size={theme.size.msgFootIcon} />
    </Menu>
  );
}

/** 发送队列里的文本：发送中压暗 */
export function PendingRow({ item }: { info: MessageRenderInfo<RowData>; item: OutboxItem }) {
  const ctx = useRowContext();
  const items = ctx.pendingMenu(item);
  const msg = pendingMsg(item, ctx.body.userId);
  const { body } = msgContent(msg, ctx.body);
  const failed = item.state === 'failed';
  return (
    <Dimmed on={!failed}>
      <MsgFrame own userid={ctx.body.userId} name={ctx.group} text foot={<PendingFoot failed={failed} items={items} />}>
        <BubbleTouch rowStyle={styles.bubbleRow} bubbleStyle={styles.bubble(true)} menu={items.length > 0 ? () => items : undefined}>
          <View style={styles.content}>
            <MessageBody body={body} tone={ctx.tones.own} />
          </View>
        </BubbleTouch>
      </MsgFrame>
    </Dimmed>
  );
}

const extOf = (name: string) => (name.includes('.') ? name.split('.').pop()! : '');

/** 发送中的文件：图片、视频按本地内容占位，中间是进度环；其他文件是文件卡片，色块上是进度环 */
export function UploadRow({ item }: { info: MessageRenderInfo<RowData>; item: UploadItem }) {
  const ctx = useRowContext();
  const { theme } = useUnistyles();
  const items = ctx.uploadMenu(item);
  const failed = item.state === 'failed';
  const { file } = item;
  const media = item.duration === undefined && !!file.media;
  return (
    <MsgFrame own userid={ctx.body.userId} name={ctx.group} text={!media} foot={<PendingFoot failed={failed} items={items} />}>
      <BubbleTouch rowStyle={styles.bubbleRow} bubbleStyle={styles.bubble(true)} menu={() => items}>
        {item.duration !== undefined ? (
          <RecordBody url={file.uri} duration={item.duration} text="" tone={ctx.tones.own} />
        ) : file.media ? (
          <LocalMedia file={file}>{!failed && <UploadProgress localId={item.localId} size={theme.size.mediaPlay} scrim />}</LocalMedia>
        ) : (
          <FileCard
            name={file.name}
            ext={extOf(file.name)}
            size={file.size}
            tone={ctx.tones.own}
            tile={failed ? undefined : <UploadProgress localId={item.localId} size={theme.size.fileTile} />}
          />
        )}
      </BubbleTouch>
    </MsgFrame>
  );
}

const styles = StyleSheet.create((theme, rt) => {
  const { size } = theme;
  const narrow = rt.breakpoint === 'xs';
  return {
    row: (own: boolean) => ({
      flexDirection: own ? 'row-reverse' : 'row',
      alignItems: 'flex-start',
      paddingHorizontal: narrow ? size.msgPadXNarrow : size.msgPadX,
    }),
    avatar: { marginBottom: size.msgAvatarBottom },
    // 窄屏气泡对侧至少留出 msgFarNarrow（含头像列），宽屏文字类最宽 70%
    view: (own: boolean, text: boolean) => ({
      flex: 1,
      minWidth: 0,
      alignItems: own ? 'flex-end' : 'flex-start',
      ...(own ? { marginRight: size.msgAvatarGap } : { marginLeft: size.msgAvatarGap }),
      ...(text && narrow && { [own ? 'marginLeft' : 'marginRight']: size.msgFarNarrow - size.avatar.msg - size.msgAvatarGap }),
      ...(text && !narrow && { maxWidth: `${size.msgTextMax * 100}%` as const }),
    }),
    name: { ...theme.typography.msgName, maxWidth: '100%', marginBottom: size.msgNameGap, color: theme.colors.regularText, opacity: 0.8 },
    bubbleRow: { flexDirection: 'row', maxWidth: '100%' },
    // 气泡在横排的行里（左边可能有多选圈）：要能收窄，长文字才会换行
    bubble: (own: boolean) => ({
      flexShrink: 1,
      minWidth: 0,
      padding: size.msgBubblePad,
      borderRadius: size.msgBubbleRadius,
      ...(own
        ? { backgroundColor: theme.colors.primary, borderTopRightRadius: size.msgBubbleTip }
        : { backgroundColor: theme.colors.msgBubbleIn, borderTopLeftRadius: size.msgBubbleTip }),
    }),
    bare: { flexShrink: 1, minWidth: 0 },
    content: { padding: size.msgTextPad },
    quote: { paddingLeft: size.msgReplyPad, marginBottom: theme.spacing.xs },
    quoteBar: (own: boolean) => ({
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: size.msgReplyBar,
      borderRadius: theme.radius.swatch,
      backgroundColor: own ? theme.colors.onPrimary : theme.colors.msgReplyBar,
    }),
    quoteName: (own: boolean) => ({ ...theme.typography.msgReplyName, color: own ? theme.colors.onPrimary : theme.colors.primary }),
    quoteDesc: (own: boolean) => ({ ...theme.typography.msgReplyDesc, color: own ? theme.colors.onPrimary : theme.colors.titleText }),
    reactions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
    reaction: (own: boolean, mine: boolean) => ({
      flexDirection: 'row',
      alignItems: 'flex-start',
      maxWidth: '100%',
      marginTop: size.msgReactionTop,
      marginRight: size.msgReactionGap,
      paddingHorizontal: size.msgReactionPadX,
      paddingVertical: size.msgReactionPadY,
      borderRadius: theme.radius.pill,
      backgroundColor: own ? (mine ? theme.colors.msgReactionOwnMine : theme.colors.msgReactionOwn) : mine ? theme.colors.msgReactionMine : theme.colors.msgReaction,
    }),
    reactionSymbol: narrow ? theme.typography.reactionSymbolNarrow : theme.typography.reactionSymbol,
    reactionUsers: { flexShrink: 1, minWidth: 0, paddingLeft: size.msgReactionUsers },
    reactionNames: (own: boolean) => ({ ...theme.typography.reactionNames, color: own ? theme.colors.onPrimary : theme.colors.msgReactionNames }),
    foot: { flexDirection: 'row', alignItems: 'center', height: size.msgFoot, paddingTop: size.msgFootTop },
    footItem: { flexDirection: 'row', alignItems: 'center', marginRight: size.msgFootGap },
    replyNum: { ...theme.typography.msgFoot, marginLeft: 2, color: theme.colors.primary },
    time: { ...theme.typography.msgFoot, color: theme.colors.msgTime, cursor: 'pointer' },
    read: { marginLeft: theme.spacing.xs, flexDirection: 'row', alignItems: 'center' },
  };
});

