import { BellOff, Bot, Check, CheckCheck, CircleCheckBig } from 'lucide-react-native';
import { memo, useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { type CSSAnimationKeyframes } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../i18n';
import type { SearchItem } from '../../sync/api/dialog';
import { dialogMention, dialogUnread, type StoredDialog } from '../../sync/messenger';
import { draftPreview, lastSenderId, msgPreview } from '../../sync/messenger/preview';
import { type AvatarSize, DialogAvatar, UserAvatar } from '../../ui/Avatar';
import { Badge } from '../../ui/Badge';
import { Icon } from '../../ui/Icon';
import { Menu } from '../../ui/popover';
import { useBreakpoint } from '../../ui/theme';
import { Touchable } from '../../ui/Touchable';
import { thinLine } from '../../ui/thinLine';
import { useSession } from '../session';
import { markBackground } from './colors';
import { useDialogMenu } from './dialogMenu';
import { useToday } from './clock';
import { useDialog, useMessengerState, useUser } from './hooks';
import { listTimeText } from './listModel';
import { PreviewText } from './PreviewText';

/** 会话行能显示的数据：本地会话和搜索结果（联系人的 id 是 `u:<userid>`）共用 */
export type RowData = StoredDialog | SearchItem;

export interface DialogRowBodyProps {
  d: RowData;
  /** 草稿 HTML；正在看的会话不显示草稿 */
  draft?: string;
  /** 当前打开的会话 */
  active?: boolean;
  /** 搜索时不按置顶标底色（同旧版） */
  searching?: boolean;
  /** 菜单打开期间给这一行描边（同旧版） */
  operating?: boolean;
  /** 窄屏行底的分隔线；最后一行不画 */
  line?: boolean;
}

/**
 * 会话行（L2–L4），照旧版：42 头像，名字一行（待办、@、机器人、标签、名字、已读、时间），
 * 摘要一行（草稿或群里的发送者 + 最后一条、免打扰），未读角标压在头像右上
 */
export function DialogRowBody({ d, draft, active = false, searching = false, operating = false, line = false }: DialogRowBodyProps) {
  const t = useT();
  const { theme } = useUnistyles();
  const selfId = useSession((s) => s.user?.userid ?? 0);
  const last = d.last_msg;
  const peer = d.dialog_user?.userid ?? 0;
  const mention = dialogMention(d as StoredDialog);
  const todo = d.todo_num ?? 0;
  const unread = dialogUnread(d as StoredDialog, true);
  const info = d.group_info;
  const tagged = d.type === 'group' && (d.group_type === 'project' || d.group_type === 'task');
  const completed = tagged && d.group_type === 'task' && !!info?.complete_at;
  // 单聊里自己发的最后一条：对方读了两个勾、没读一个勾（和自己的会话不显示）
  const readMark = d.type === 'user' && last?.userid === selfId && peer !== selfId ? ((last as { percentage?: number }).percentage === 100 ? CheckCheck : Check) : null;
  // 标了颜色的优先，其次当前打开、置顶
  const background = markBackground(theme, d.color) ?? (active ? theme.colors.rowActive : d.top_at && !searching ? theme.colors.rowTop : theme.colors.surface);

  return (
    <View testID="dialog-row" style={styles.row(background)}>
      <View style={styles.avatar}>
        <RowAvatar d={d} size={theme.size.avatar.list} withOnline />
      </View>
      <View style={styles.box(completed)}>
        <View style={styles.title}>
          {todo > 0 && <Text style={styles.alert}>[{t('messenger:todo')}{todo > 999 ? '999+' : todo > 1 ? todo : ''}]</Text>}
          {mention > 0 && <Text style={styles.alert}>[@{mention}]</Text>}
          {!!d.bot && (
            <View style={styles.bot}>
              <Icon icon={Bot} color={theme.colors.primary} size={theme.typography.body.fontSize} />
            </View>
          )}
          {tagged && info?.deleted_at ? <Tag text={t('messenger:tag.deleted')} danger /> : tagged && info?.archived_at ? <Tag text={t('messenger:tag.archived')} /> : null}
          <Text style={styles.name} numberOfLines={1}>
            {d.name}
          </Text>
          {readMark && (
            <View style={styles.after}>
              <Icon icon={readMark} color={theme.colors.primary} size={theme.size.readMark} />
            </View>
          )}
          <RowTime lastAt={d.last_at} />
        </View>
        <View style={styles.text}>
          {draft ? <DraftLine html={draft} /> : <LastLine d={d} selfId={selfId} />}
          {!!d.silence && (
            <View style={styles.silence}>
              <Icon icon={BellOff} color={theme.colors.descText} size={theme.size.silenceIcon} />
            </View>
          )}
        </View>
      </View>
      {unread > 0 && (
        <View style={styles.badge}>
          <Badge count={unread} muted={!!d.silence} scale={ROW_BADGE_SCALE} origin="right" />
        </View>
      )}
      {completed && (
        <View style={styles.completed}>
          <Icon icon={CircleCheckBig} color={theme.colors.success} size={theme.size.completedMark} />
        </View>
      )}
      {line && <View testID="dialog-row-line" style={styles.line} />}
      {operating && <View style={styles.operate} />}
    </View>
  );
}

/** 旧版行内角标缩到 0.8 */
const ROW_BADGE_SCALE = 0.8;

/** 会话头像：群按群类型；单聊是对方的头像，withOnline 时带在线点（自己和机器人算在线） */
export function RowAvatar({ d, size, withOnline = false }: { d: RowData; size: AvatarSize; withOnline?: boolean }) {
  if (d.type === 'group') return <DialogAvatar uri={d.avatar} groupType={d.group_type} size={size} />;
  if (!d.dialog_user) return <DialogAvatar person size={size} />;
  const userid = d.dialog_user.userid;
  const avatar = { uri: d.userimg, userid, name: d.name ?? '', bot: !!d.bot, size };
  return withOnline ? <OnlineAvatar {...avatar} /> : <UserAvatar {...avatar} />;
}

function OnlineAvatar(props: { uri?: string | null; userid: number; name: string; bot: boolean; size: AvatarSize }) {
  const selfId = useSession((s) => s.user?.userid ?? 0);
  const online = useUser(props.userid)?.online;
  return <UserAvatar {...props} online={props.bot || props.userid === selfId || !!online} />;
}

function Tag({ text, danger = false }: { text: string; danger?: boolean }) {
  return (
    <View style={styles.tag(danger)}>
      <Text style={styles.tagText(danger)} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

/** 列表时间同旧版：今天 HH:mm、昨天 HH:mm、今年 MM-DD、跨年 YYYY-MM-DD */
function RowTime({ lastAt }: { lastAt: string | null | undefined }) {
  const t = useT();
  const today = useToday();
  const text = listTimeText(lastAt, today, t('messenger:yesterday'));
  if (!text) return null;
  return <Text style={styles.time}>{text}</Text>;
}

function DraftLine({ html }: { html: string }) {
  const t = useT();
  return (
    <>
      <Text style={styles.prefix}>
        <Text style={styles.draft}>[{t('messenger:draft')}]</Text>:
      </Text>
      <Text style={styles.last} numberOfLines={1}>
        <PreviewText preview={draftPreview(html)} />
      </Text>
    </>
  );
}

/** 最后一条：群里先显示发送者（自己是「你」）；有回应的带第一个表情；没有消息的单聊显示对方职位 */
function LastLine({ d, selfId }: { d: RowData; selfId: number }) {
  const preview = msgPreview(d.last_msg);
  const emoji = (d.last_msg as { emoji?: { symbol?: string }[] } | null | undefined)?.emoji?.[0]?.symbol;
  const senderId = d.type === 'group' && d.last_msg ? lastSenderId(d.last_msg) : 0;
  const profession = (d.dialog_user as { profession?: string } | null | undefined)?.profession;
  return (
    <>
      {senderId > 0 && <SenderName userid={senderId} self={senderId === selfId} />}
      {!!emoji && (
        <View style={styles.emoji}>
          <Text style={styles.emojiText}>{emoji}</Text>
        </View>
      )}
      <Text style={styles.last} numberOfLines={1}>
        {preview ? <PreviewText preview={preview} /> : profession ? `[${profession}]` : null}
      </Text>
    </>
  );
}

function SenderName({ userid, self }: { userid: number; self: boolean }) {
  const t = useT();
  const user = useUser(self ? 0 : userid);
  const name = self ? t('messenger:self') : user?.nickname;
  if (!name) return null;
  return (
    <Text style={[styles.prefix, styles.sender]} numberOfLines={1}>
      {name}:
    </Text>
  );
}

/** 晃动（同旧版 common-shake）：停 200ms 后左右抖 600ms */
const SHAKE: CSSAnimationKeyframes = {
  '0%': { transform: [{ translateX: 0 }] },
  '10%': { transform: [{ translateX: -1 }] },
  '20%': { transform: [{ translateX: 2 }] },
  '30%': { transform: [{ translateX: -4 }] },
  '40%': { transform: [{ translateX: 4 }] },
  '50%': { transform: [{ translateX: -4 }] },
  '60%': { transform: [{ translateX: 4 }] },
  '70%': { transform: [{ translateX: -4 }] },
  '80%': { transform: [{ translateX: 2 }] },
  '90%': { transform: [{ translateX: -1 }] },
  '100%': { transform: [{ translateX: 0 }] },
};
const SHAKE_STYLE = { animationName: SHAKE, animationDuration: 600, animationDelay: 200 } as const;

export interface DialogRowProps {
  id: number;
  active: boolean;
  /** 不为 0 时晃动一次，值变了再晃 */
  shake: number;
  /** 窄屏行底分隔线 */
  line: boolean;
  /** 搜索结果里：置顶的不显示置顶底色 */
  searching: boolean;
  onOpen: (id: number) => void;
}

/** 列表里的一行：只订阅自己这一条会话，App 上长按、Web 上右键弹出会话菜单（宽屏在行下方、窄屏在行上方；App 上也自绘，同旧版） */
export const DialogRow = memo(function DialogRow({ id, active, shake, line, searching, onOpen }: DialogRowProps) {
  const d = useDialog(id);
  const draft = useMessengerState((s) => (s.openId === id ? undefined : s.drafts[id]));
  const items = useDialogMenu(d);
  const narrow = useBreakpoint() === 'xs';
  const [operating, setOperating] = useState(false);
  const open = useCallback(() => onOpen(id), [onOpen, id]);
  if (!d) return null;
  return (
    <Animated.View key={shake} style={shake ? SHAKE_STYLE : undefined}>
      <Menu
        items={items}
        trigger="context"
        drawn
        onPress={open}
        accessibilityLabel={d.name}
        iconEnd
        placement={{ side: narrow ? 'top' : 'bottom', align: 'center' }}
        onOpenChange={setOperating}
      >
        <DialogRowBody d={d} draft={hasDraftText(draft) ? draft : undefined} active={active} searching={searching} operating={operating} line={line} />
      </Menu>
    </Animated.View>
  );
});

/** 搜索结果、标注列表里的行：不是本地会话的一部分，没有菜单 */
export const ResultRow = memo(function ResultRow({ item, line, onOpen }: { item: SearchItem; line: boolean; onOpen: (item: SearchItem) => void }) {
  return (
    <Touchable accessibilityRole="button" accessibilityLabel={item.name} onPress={() => onOpen(item)}>
      <DialogRowBody d={item} searching line={line} />
    </Touchable>
  );
});

const hasDraftText = (html: string | undefined): html is string => {
  if (!html) return false;
  const p = draftPreview(html);
  return p.labels.length > 0 || p.text !== '';
};

const styles = StyleSheet.create((theme) => ({
  row: (background: string) => ({
    height: theme.size.dialogRow,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: background,
  }),
  avatar: {
    margin: theme.size.avatarGap,
  },
  box: (completed: boolean) => ({
    flex: 1,
    minWidth: 0,
    paddingLeft: theme.spacing.md,
    paddingRight: completed ? theme.size.completedPad : 0,
  }),
  title: {
    flexDirection: 'row',
    alignItems: 'center',
    height: theme.typography.listTitle.lineHeight,
  },
  alert: {
    ...theme.typography.listTitle,
    fontWeight: '600',
    color: theme.colors.alert,
    marginRight: theme.spacing.xs,
  },
  bot: {
    marginRight: theme.spacing.xs,
  },
  name: {
    ...theme.typography.listTitle,
    flex: 1,
    color: theme.colors.titleText,
  },
  after: {
    marginLeft: theme.spacing.sm,
  },
  tag: (danger: boolean) => ({
    height: theme.size.tag,
    justifyContent: 'center',
    paddingHorizontal: theme.size.tagPadding,
    marginRight: theme.spacing.xs,
    borderRadius: theme.radius.tag,
    borderWidth: 1,
    borderColor: danger ? theme.colors.tagRedLine : theme.colors.menuDivider,
    backgroundColor: danger ? theme.colors.tagRedFill : theme.colors.searchFill,
  }),
  tagText: (danger: boolean) => ({
    ...theme.typography.caption,
    color: danger ? theme.colors.tagRedText : theme.colors.tagText,
  }),
  time: {
    ...theme.typography.caption,
    marginLeft: theme.spacing.sm,
    color: theme.colors.descText,
  },
  text: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: theme.typography.listDesc.lineHeight,
  },
  prefix: {
    ...theme.typography.listDesc,
    flexShrink: 0,
    marginRight: theme.spacing.xs,
    color: theme.colors.descText,
  },
  sender: {
    flexShrink: 1,
  },
  draft: {
    color: theme.colors.alert,
  },
  emoji: {
    width: theme.size.emojiPill.width,
    height: theme.size.emojiPill.height,
    marginRight: theme.spacing.xs,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.emojiPill,
  },
  emojiText: {
    ...theme.typography.subhead,
    lineHeight: theme.size.emojiPill.height,
  },
  last: {
    ...theme.typography.listDesc,
    flex: 1,
    color: theme.colors.descText,
  },
  silence: {
    paddingLeft: theme.spacing.xs,
    opacity: 0.5,
  },
  badge: {
    position: 'absolute',
    top: theme.size.rowBadgeTop,
    left: 0,
    width: theme.size.rowBadgeRight,
    alignItems: 'flex-end',
  },
  completed: {
    position: 'absolute',
    bottom: theme.size.completedBottom,
    right: theme.spacing.md,
    opacity: 0.2,
  },
  line: {
    ...thinLine,
    position: 'absolute',
    left: theme.size.rowLineLeft,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.rowLine,
  },
  operate: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    pointerEvents: 'none',
  },
}));
