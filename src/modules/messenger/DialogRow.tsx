import { BellOff, Bot, Check, CheckCheck } from 'lucide-react-native';
import { memo, useCallback } from 'react';
import { PixelRatio, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { dateFormats, useLanguage, useT } from '../../i18n';
import type { SearchItem } from '../../sync/api/dialog';
import { dialogMention, dialogUnread, type StoredDialog } from '../../sync/messenger';
import { draftPreview, lastSenderId, msgPreview } from '../../sync/messenger/preview';
import { type AvatarSize, DialogAvatar, UserAvatar } from '../../ui/Avatar';
import { Badge } from '../../ui/Badge';
import { Icon } from '../../ui/Icon';
import { Menu } from '../../ui/popover';
import { Touchable } from '../../ui/Touchable';
import { useSession } from '../session';
import { markBackground } from './colors';
import { useDialogMenu } from './dialogMenu';
import { useToday } from './clock';
import { useDialog, useMessengerState, useUser } from './hooks';
import { listTime } from './listModel';
import { PreviewText } from './PreviewText';

/** 会话行能显示的数据：本地会话和搜索结果（联系人的 id 是 `u:<userid>`）共用 */
export type RowData = StoredDialog | SearchItem;

export interface DialogRowBodyProps {
  d: RowData;
  /** 草稿 HTML；正在看的会话不显示草稿 */
  draft?: string;
  selected?: boolean;
  /** 「跳到下一个未读」落到的行，短暂高亮 */
  highlighted?: boolean;
  pressed: boolean;
  hovered: boolean;
}

/** 会话行（L2–L4）：头像、名字一行（待办、@、标签、已读、时间），摘要一行（草稿或最后一条、免打扰、未读） */
export function DialogRowBody({ d, draft, selected = false, highlighted = false, pressed, hovered }: DialogRowBodyProps) {
  const t = useT();
  const { theme } = useUnistyles();
  const selfId = useSession((s) => s.user?.userid ?? 0);
  const last = d.last_msg;
  const peer = d.dialog_user?.userid ?? 0;
  const mention = dialogMention(d as StoredDialog);
  const todo = d.todo_num ?? 0;
  const unread = dialogUnread(d as StoredDialog, true);
  const info = d.group_info;
  const mine = !!last && last.userid === selfId;
  // 单聊里自己发的最后一条显示对方是否已读（和自己的会话不显示）
  const readMark = d.type === 'user' && mine && peer !== selfId ? ((last?.msg as { percentage?: number } | undefined)?.percentage === 100 ? 'all' : 'sent') : null;
  const background = pressed ? theme.colors.fillPressed : selected || highlighted ? theme.colors.rowHighlight : hovered ? theme.colors.hover : (markBackground(theme, d.color) ?? (d.top_at ? theme.colors.surface2 : theme.colors.surface));

  return (
    <View style={styles.row(background)}>
      <RowAvatar d={d} />
      <View style={styles.body}>
        <View style={styles.line}>
          {todo > 0 && <Text style={styles.alert}>[{t('messenger:todo')}{todo > 1 ? (todo > 999 ? '999+' : todo) : ''}]</Text>}
          {mention > 0 && <Text style={styles.alert}>[@{mention > 999 ? '999+' : mention}]</Text>}
          {!!d.bot && <Icon icon={Bot} color={theme.colors.primaryText} size={theme.size.iconSmall} />}
          {info?.deleted_at ? <Tag text={t('messenger:tag.deleted')} danger /> : info?.archived_at ? <Tag text={t('messenger:tag.archived')} /> : null}
          <Text style={styles.name} numberOfLines={1}>
            {d.name}
          </Text>
          {readMark && <Icon icon={readMark === 'all' ? CheckCheck : Check} color={theme.colors.primaryText} size={theme.size.iconSmall} />}
          <RowTime lastAt={d.last_at} />
        </View>
        <View style={styles.line}>
          <Text style={styles.preview} numberOfLines={1}>
            {draft ? <DraftLine html={draft} /> : <LastLine d={d} mine={mine} />}
          </Text>
          {!!d.silence && <Icon icon={BellOff} color={theme.colors.text4} size={theme.size.iconSmall} />}
          <Badge count={unread} muted={!!d.silence} />
        </View>
      </View>
    </View>
  );
}

/** 会话头像：单聊是对方的头像，其余按群类型 */
export function RowAvatar({ d, size = 48 }: { d: RowData; size?: AvatarSize }) {
  if (d.type === 'user') {
    const userid = d.dialog_user?.userid ?? 0;
    return <UserAvatar uri={d.userimg} userid={userid} name={d.name ?? ''} bot={!!d.bot} size={size} />;
  }
  return <DialogAvatar uri={d.avatar} groupType={d.group_type} size={size} />;
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

/** 列表时间（docs/ui-spec.md 第 7 节）：今天时分、昨天、今年月日、跨年年月日 */
function RowTime({ lastAt }: { lastAt: string | null | undefined }) {
  const t = useT();
  const language = useLanguage();
  const today = useToday();
  const time = listTime(lastAt, today);
  if (!time) return null;
  const f = dateFormats(language);
  const text =
    time.kind === 'today'
      ? f.time(time.date)
      : time.kind === 'yesterday'
        ? `${t('messenger:yesterday')} ${f.time(time.date)}`
        : time.kind === 'thisYear'
          ? f.monthDay(time.date)
          : f.full(time.date);
  return <Text style={styles.time}>{text}</Text>;
}

function DraftLine({ html }: { html: string }) {
  const t = useT();
  return (
    <>
      <Text style={styles.alert}>[{t('messenger:draft')}]</Text> <PreviewText preview={draftPreview(html)} />
    </>
  );
}

/** 最后一条：群里显示发送者，自己发的显示「你」；没有消息的单聊显示对方职位 */
function LastLine({ d, mine }: { d: RowData; mine: boolean }) {
  const preview = msgPreview(d.last_msg);
  if (!preview) {
    const profession = (d.dialog_user as { profession?: string } | null | undefined)?.profession;
    return profession ? `[${profession}]` : null;
  }
  const emoji = (d.last_msg as { emoji?: { symbol?: string }[] } | null | undefined)?.emoji?.[0]?.symbol;
  const senderId = lastSenderId(d.last_msg);
  return (
    <>
      {(mine || (d.type === 'group' && senderId > 0)) && <SenderName userid={senderId} mine={mine} />}
      {emoji ? `${emoji} ` : ''}
      <PreviewText preview={preview} />
    </>
  );
}

function SenderName({ userid, mine }: { userid: number; mine: boolean }) {
  const t = useT();
  const user = useUser(mine ? 0 : userid);
  const name = mine ? t('messenger:self') : user?.nickname;
  return name ? `${name}: ` : null;
}

/** 列表里的一行：只订阅自己这一条会话，App 上长按、Web 上右键弹出会话菜单 */
export const DialogRow = memo(function DialogRow({ id, selected, highlighted, onOpen }: { id: number; selected: boolean; highlighted: boolean; onOpen: (id: number) => void }) {
  const d = useDialog(id);
  const draft = useMessengerState((s) => (s.openId === id ? undefined : s.drafts[id]));
  const items = useDialogMenu(d);
  const open = useCallback(() => onOpen(id), [onOpen, id]);
  if (!d) return null;
  return (
    <Menu items={items} trigger="context" onPress={open} accessibilityLabel={d.name}>
      {({ pressed, hovered }) => <DialogRowBody d={d} draft={hasDraftText(draft) ? draft : undefined} selected={selected} highlighted={highlighted} pressed={pressed} hovered={hovered} />}
    </Menu>
  );
});

/** 搜索结果、标注列表里的行：不是本地会话的一部分，没有菜单 */
export const ResultRow = memo(function ResultRow({ item, onOpen }: { item: SearchItem; onOpen: (item: SearchItem) => void }) {
  return (
    <Touchable accessibilityRole="button" accessibilityLabel={item.name} onPress={() => onOpen(item)}>
      {({ pressed, hovered }) => <DialogRowBody d={item} pressed={pressed} hovered={hovered} />}
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
    minHeight: PixelRatio.roundToNearestPixel(theme.size.rowDouble),
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingLeft: theme.spacing.page,
    backgroundColor: background,
  }),
  body: {
    flex: 1,
    alignSelf: 'stretch',
    justifyContent: 'center',
    gap: theme.spacing.xs / 2,
    paddingVertical: theme.spacing.sm,
    paddingRight: theme.spacing.page,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.separator,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  name: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '500',
    flex: 1,
  },
  alert: {
    ...theme.typography.subhead,
    color: theme.colors.danger,
  },
  tag: (danger: boolean) => ({
    paddingHorizontal: theme.spacing.xs,
    borderRadius: theme.radius.bubbleTight,
    backgroundColor: danger ? theme.colors.danger : theme.colors.fill,
  }),
  tagText: (danger: boolean) => ({
    ...theme.typography.caption2,
    color: danger ? theme.colors.onPrimary : theme.colors.text2,
  }),
  time: {
    ...theme.typography.caption,
    color: theme.colors.text3,
  },
  preview: {
    ...theme.typography.subhead,
    color: theme.colors.text3,
    flex: 1,
  },
}));
