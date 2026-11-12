import { Check, CheckCheck, CircleAlert, ListTodo, X } from 'lucide-react-native';
import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useStore } from 'zustand';

import { useT } from '../../../i18n';
import type { Msg } from '../../../sync/api/dialog';
import { type OutboxItem, type UploadItem, type WithdrawnMsg } from '../../../sync/messenger';
import { textBlocks, type BodyContext, type MsgBody, type Reaction } from '../../../sync/messenger/body';
import { type MessageRenderInfo } from '../../../ui/chat';
import { Icon } from '../../../ui/Icon';
import { Menu, type MenuEntry } from '../../../ui/popover';
import { Touchable } from '../../../ui/Touchable';
import { useMessenger, useMessengerState, useUser } from '../hooks';
import type { BubbleTouchProps, RowRef } from './bubbleTouchTypes';
import { type RowData } from './chatModel';
import { type BubbleTone, RichBlocks } from './RichText';
import type { SelectDrag } from './selectDrag';
import type { Selection } from './selection';

/* 消息行两端共用的部分：行上下文、名字、译文、已读标记、发送失败提示、上传进度 */

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
  /** 点气泡：打开图片、文件，播放语音，查看全文；点接龙卡片的「参与接龙」 */
  onOpen: (msg: Msg, body: MsgBody) => void;
  /** 点回应胶囊、双击、表情条（自己回应过的再点即取消） */
  onReact: (msg: Msg, symbol: string) => void;
  /** 长按回应胶囊：回应详情（谁回应了） */
  onReactionList: (reactions: readonly Reaction[], symbol: string) => void;
  /** 点回复引用：跳到原消息 */
  onQuote: (id: number) => void;
  /** 点「N 条回复」：打开回复线程（F7）；线程里没有 */
  onThread?: (msg: Msg) => void;
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

export const useRowContext = () => useContext(RowContextValue)!;

/** 筛选待办时我还没完成的消息 id（同旧版 App 标成警示色）。单独走 context：换筛选时只重画待办图标 */
/** 多选时 Web 消息行头像前的勾选格（旧版网页勾选在行内，自己的消息在右侧）；不在多选或不能选时为 null */
export const SelectCheckContext = createContext<ReactNode>(null);

export const MyTodosContext = createContext<ReadonlySet<number> | undefined>(undefined);

export function TodoMark({ id, color }: { id: number; color: string }) {
  const { theme } = useUnistyles();
  const mine = useContext(MyTodosContext)?.has(id);
  return <Icon icon={ListTodo} color={mine ? theme.colors.warning : color} size={12} />;
}

/** 点了有反应的消息体 */
export const OPENABLE = new Set<MsgBody['kind']>(['image', 'video', 'file', 'record']);

/** 名字：AI 助手（userid -1）用消息带的名字 */
export function useName(userid: number, aiName?: string): string {
  const t = useT();
  const user = useUser(userid);
  if (userid === -1) return aiName || t('messenger:chat.ai');
  return user?.nickname ?? '';
}

const DIM_OPACITY = 0.6;
const DIM_TIMING = { duration: 200, easing: Easing.out(Easing.quad) };

/** 发送中压暗；发送中与发出后是同一行（同一个键），发出时渐变回来 */
export function Dimmed({ on, children }: { on: boolean; children: ReactNode }) {
  const opacity = useSharedValue(on ? DIM_OPACITY : 1);
  useEffect(() => {
    opacity.set(withTiming(on ? DIM_OPACITY : 1, DIM_TIMING));
  }, [on, opacity]);
  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={animated}>{children}</Animated.View>;
}

/** 交给 BubbleTouch 的手势与菜单（外框之外的部分） */
export type Touch = Omit<BubbleTouchProps, 'rowStyle' | 'bubbleStyle' | 'leading' | 'children'>;

/** 气泡里正文下方：本地显示的译文；翻译、转文字进行中的提示 */
export function Understanding({ msg, tone }: { msg: Msg; tone: BubbleTone }) {
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
export function TranslationText({ msg, content, tone }: { msg: Msg; content: string; tone: BubbleTone }) {
  const ctx = useRowContext();
  if (msg.type !== 'text' && msg.type !== 'longtext') return <Text style={[styles.translation, { color: tone.text }]}>{content}</Text>;
  const md = (msg.msg as { type?: unknown } | null)?.type === 'md';
  return <RichBlocks blocks={textBlocks(content, md, ctx.body)} tone={tone} />;
}

const READ_SIZE = { icon: 14, ring: 12 };
const RING_STROKE = 2;
export const RING_START = { transform: [{ rotate: '-90deg' }] };

/** 自己消息的已读标记：单聊未读一个勾、已读两个勾；群聊是已读比例圆环，全部已读换成双勾；size 是勾和圆环的边长 */
export function ReadMark({ group, percent, color, size = READ_SIZE }: { group: boolean; percent: number; color: string; size?: { icon: number; ring: number } }) {
  if (!group || percent >= 100) return <Icon icon={percent > 0 ? CheckCheck : Check} color={color} size={size.icon} />;
  const center = size.ring / 2;
  const r = center - RING_STROKE / 2;
  const length = 2 * Math.PI * r;
  return (
    // 进度从 12 点方向开始：整个图转 -90°（SVG 的 rotation / origin 在 Web 上会变成非法 DOM 属性）
    <Svg width={size.ring} height={size.ring} style={RING_START}>
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

/** 发送失败的提示：气泡下方一行红字，点了选择重新发送或删除 */
export function FailedNote({ items, error }: { items: readonly MenuEntry[]; error: string }) {
  const { theme } = useUnistyles();
  return (
    <Menu items={items} accessibilityLabel={error} style={styles.failedRow}>
      <Icon icon={CircleAlert} color={theme.colors.danger} size={14} />
      <Text style={styles.failedText}>{error}</Text>
    </Menu>
  );
}

const PROGRESS_STROKE = 3;

/** 上传进度环，中间的叉取消发送；只有这一块订阅进度，进度变化不重画整行 */
export function UploadProgress({ localId, size, scrim }: { localId: string; size: number; scrim?: boolean }) {
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
export function pendingMsg(item: OutboxItem, userId: number): Msg {
  return { id: 0, dialog_id: item.dialog_id, userid: userId, type: 'text', msg: { text: item.text, type: item.md ? 'md' : undefined }, created_at: '' };
}

const styles = StyleSheet.create((theme) => ({
  caption: { ...theme.typography.caption },
  pressed: { opacity: theme.opacity.pressedIcon },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: theme.spacing.sm },
  busy: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  translation: { ...theme.typography.body },
  failedRow: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.page, paddingVertical: theme.spacing.xs,
  },
  failedText: { ...theme.typography.caption, color: theme.colors.danger },
  progress: (size: number) => ({ width: size, height: size, borderRadius: theme.radius.pill, alignItems: 'center', justifyContent: 'center' }),
  progressScrim: { backgroundColor: theme.colors.mediaScrim },
}));
