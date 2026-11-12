import { router } from 'expo-router';
import { ChevronLeft, CircleCheckBig } from 'lucide-react-native';
import { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { dateFormats, useLanguage, useT } from '../../../i18n';
import { dialogUnread, type StoredDialog } from '../../../sync/messenger';
import { DialogAvatar } from '../../../ui/Avatar';
import { Icon } from '../../../ui/Icon';
import { useSplitView } from '../../../ui/layout';
import { Tag } from '../../../ui/Tag';
import { Touchable } from '../../../ui/Touchable';
import { useSession } from '../../session';
import { useNow } from '../clock';
import { ChatMenu, openChatInfo } from '../group/ChatMenu.web';
import { useMessengerState, useUser } from '../hooks';
import { OnlineAvatar } from '../OnlineAvatar';
import { countText, onlineText } from './format';
import { MSG_TYPE_ICONS, MSG_TYPE_LABELS, useMsgTypes } from './msgTypes';

/**
 * Web 聊天页标题栏（同旧版网页 DialogWrapper 的 dialog-nav）。
 * 宽屏：高 68，左侧会话头像，右边标题行（标签、名称、群人数、机器人 / 全员 / 部门标签）和分类条，最右「…」。
 * 窄屏：灰底，返回键（旁边是其他会话的未读）、居中标题和在线状态、右侧「…」，分类条单独一行。
 */
export function ChatHeader({ dialogId, dialog }: { dialogId: number; dialog: StoredDialog | undefined }) {
  const { theme } = useUnistyles();
  const wide = useSplitView();
  const completed = !!dialog && dialog.type === 'group' && dialog.group_type === 'task' && !!dialog.group_info?.complete_at;
  const types = dialog && <TypeBar dialog={dialog} wide={wide} />;

  if (wide) {
    return (
      <View testID="chat-header" style={styles.wide}>
        {dialog && (
          <View style={styles.block}>
            <Touchable style={styles.avatar} onPress={() => openChatInfo(dialog)}>
              {dialog.type === 'group' ? (
                <DialogAvatar uri={dialog.avatar} groupType={dialog.group_type} size={theme.size.avatar.list} />
              ) : (
                <OnlineAvatar uri={dialog.userimg} userid={dialog.dialog_user?.userid ?? 0} name={dialog.name ?? ''} bot={!!dialog.bot} size={theme.size.avatar.list} />
              )}
            </Touchable>
            <View style={styles.titleCol(true)}>
              <Title dialog={dialog} />
              {types}
            </View>
          </View>
        )}
        {completed && (
          <View style={styles.done(true)}>
            <Icon icon={CircleCheckBig} color={theme.colors.success} size={theme.size.chatHeadDone} />
          </View>
        )}
        <ChatMenu dialog={dialog} style={styles.menu} />
      </View>
    );
  }

  return (
    <View testID="chat-header" style={styles.narrow}>
      <View style={styles.narrowBar}>
        {dialog && (
          <View style={styles.titleCol(false)}>
            <Title dialog={dialog} />
            {dialog.type === 'user' && <PeerOnline dialog={dialog} />}
          </View>
        )}
        {completed && (
          <View style={styles.done(false)}>
            <Icon icon={CircleCheckBig} color={theme.colors.success} size={theme.size.chatHeadDoneNarrow} />
          </View>
        )}
        <BackButton dialogId={dialogId} />
        <ChatMenu dialog={dialog} style={[styles.cell, styles.cellRight]} />
      </View>
      {types}
    </View>
  );
}

/** 标题行：已删除 / 已归档标签、名称、群人数，后面是机器人 / 全员 / 部门标签 */
function Title({ dialog }: { dialog: StoredDialog }) {
  const t = useT();
  const info = dialog.type === 'group' && (dialog.group_type === 'project' || dialog.group_type === 'task') ? dialog.group_info : null;
  const people = dialog.type === 'group' ? (dialog.people_user ?? 0) : 0;
  return (
    <Touchable style={styles.titleRow} onPress={() => openChatInfo(dialog)}>
      {info?.deleted_at ? <Tag text={t('messenger:tag.deleted')} danger style={styles.tagBefore} /> : info?.archived_at ? <Tag text={t('messenger:tag.archived')} style={styles.tagBefore} textStyle={styles.tagText} /> : null}
      <Text testID="chat-title" style={styles.title} numberOfLines={1}>{dialog.name}</Text>
      {people > 0 && <Text testID="chat-people" style={styles.people}>({people})</Text>}
      {!!dialog.bot && <Tag text={t('messenger:tag.bot')} style={styles.tagAfter} textStyle={styles.tagText} />}
      {dialog.group_type === 'all' ? <Tag text={t('messenger:tag.all')} style={styles.tagAfter} textStyle={styles.tagText} /> : dialog.group_type === 'department' ? <Tag text={t('messenger:tag.department')} style={styles.tagAfter} textStyle={styles.tagText} /> : null}
    </Touchable>
  );
}

/** 窄屏标题下：单聊对方在线（主色「在线」）或最后在线时间 */
function PeerOnline({ dialog }: { dialog: StoredDialog }) {
  const t = useT();
  const language = useLanguage();
  const now = useNow();
  const selfId = useSession((s) => s.user?.userid ?? 0);
  const userid = dialog.dialog_user?.userid ?? 0;
  const user = useUser(userid);
  const online = !!dialog.bot || userid === selfId || !!user?.online;
  const text = onlineText(online, user?.line_at, now, t, dateFormats(language));
  if (!text) return null;
  return <Text style={styles.desc(online)} numberOfLines={1}>{text}</Text>;
}

/** 窄屏返回：没有历史（深链、刷新）时回到消息列表；旁边是其他会话的未读合计 */
function BackButton({ dialogId }: { dialogId: number }) {
  const t = useT();
  const { theme } = useUnistyles();
  const dialogs = useMessengerState((s) => s.dialogs);
  const others = useMemo(() => {
    let sum = 0;
    for (const d of Object.values(dialogs)) if (d.id !== dialogId) sum += dialogUnread(d, false);
    return sum;
  }, [dialogs, dialogId]);
  return (
    <Touchable
      accessibilityRole="button"
      accessibilityLabel={t('back')}
      onPress={() => (router.canGoBack() ? router.back() : router.navigate('/messenger'))}
      style={({ pressed }) => [styles.cell, styles.back, pressed && styles.pressed]}
    >
      <Icon icon={ChevronLeft} color={theme.colors.regularText} size={theme.size.chatHeadBack} />
      {others > 0 && (
        <View style={styles.backNum}>
          <Text style={styles.backNumText}>{countText(others)}</Text>
        </View>
      )}
    </Touchable>
  );
}

/** 分类条（同旧版 title-types）：宽屏在标题下面，窄屏是标题栏下单独一行、可横向滚动 */
function TypeBar({ dialog, wide }: { dialog: StoredDialog; wide: boolean }) {
  const t = useT();
  const { theme } = useUnistyles();
  const { types, selected, select, todoNum } = useMsgTypes(dialog);
  if (types.length === 0) return null;
  return (
    <ScrollView testID="chat-types" horizontal showsHorizontalScrollIndicator={false} style={styles.types(wide)} contentContainerStyle={styles.typesContent(wide)}>
      {types.map((type) => {
        const key = type ?? 'msg';
        const active = type === selected;
        const count = type === 'todo' ? todoNum : 0;
        return (
          <Touchable key={key} testID={`chat-type-${key}`} accessibilityRole="tab" aria-selected={active} onPress={() => type === null ? select(null) : router.push({ pathname: '/messenger/media/[dialogId]', params: { dialogId: dialog.id, type } })} style={styles.type(wide, active)}>
            <View style={styles.typeIcon(wide)}>
              <Icon icon={MSG_TYPE_ICONS[key]} color={theme.palette.msgType[key]} size={wide ? theme.size.chatTypeIcon : theme.size.chatTypeIconNarrow} />
            </View>
            <Text style={styles.typeText(wide, active)} numberOfLines={1}>{t(MSG_TYPE_LABELS[key])}</Text>
            {count > 0 && (
              <View style={styles.count}>
                <Text style={styles.countText}>{count > 99 ? '99+' : count}</Text>
              </View>
            )}
          </Touchable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create((theme) => ({
  wide: {
    height: theme.size.chatHead,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.size.chatHeadPadX,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.paneLine,
  },
  block: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center' },
  avatar: { marginRight: theme.size.chatHeadAvatarGap },
  titleCol: (wide: boolean) => ({
    justifyContent: 'center',
    ...(wide ? { flex: 1, minWidth: 0 } : { maxWidth: '100%', alignItems: 'center' }),
  }),
  titleRow: { flexDirection: 'row', alignItems: 'center', maxWidth: '100%' },
  title: { ...theme.typography.title2, color: theme.colors.regularText, flexShrink: 1 },
  people: { ...theme.typography.chatPeople, color: theme.colors.regularText, marginLeft: theme.spacing.xs + 2, flexShrink: 0 },
  tagBefore: { marginRight: theme.spacing.xs + 2 },
  tagAfter: { marginLeft: theme.spacing.xs + 2 },
  // 标题旁的灰标签文字比会话行的深一点（旧版 #606266）
  tagText: { color: theme.colors.regularText },
  menu: { marginLeft: theme.size.chatHeadPadX },
  done: (wide: boolean) => ({
    position: 'absolute',
    right: wide ? theme.size.chatHeadDoneRight : theme.size.chatHeadDoneRightNarrow,
    top: '50%',
    transform: [{ translateY: -(wide ? theme.size.chatHeadDone : theme.size.chatHeadDoneNarrow) / 2 }],
    opacity: 0.2,
    pointerEvents: 'none',
  }),
  narrow: { backgroundColor: theme.colors.headerBg },
  narrowBar: {
    height: theme.size.chatHeadCell,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.size.chatHeadInset,
  },
  desc: (online: boolean) => ({ ...theme.typography.caption, paddingTop: 2, color: online ? theme.colors.primary : theme.colors.headDesc }),
  cell: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: theme.size.chatHeadCell,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellRight: { left: undefined, right: 0 },
  back: { paddingRight: theme.spacing.xs + 2 },
  pressed: { opacity: theme.opacity.pressedIcon },
  backNum: {
    position: 'absolute',
    left: theme.size.backNumLeft,
    minWidth: theme.size.backNum,
    height: theme.size.backNum,
    paddingHorizontal: theme.spacing.xs + 2,
    borderRadius: theme.size.backNum / 2,
    alignItems: 'center',
    backgroundColor: theme.colors.badgeMuted,
  },
  backNumText: { ...theme.typography.backNum, color: theme.colors.titleText, fontVariant: ['tabular-nums'] },
  types: (wide: boolean) => (wide
    ? { flexGrow: 0, marginTop: theme.size.chatTypeTop, marginBottom: -theme.size.chatTypeGap }
    : { flexGrow: 0, height: theme.size.chatTypesNarrow, marginTop: -theme.size.chatTypeTop, marginBottom: theme.size.chatTypeGap }),
  typesContent: (wide: boolean) => ({
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.size.chatTypeGap,
    paddingHorizontal: wide ? 0 : theme.size.chatTypesPadX,
    // 窄屏各项贴在 32 高的行底部（旧版上面空 4）
    paddingTop: wide ? 0 : theme.size.chatTypesNarrow - theme.typography.chatTypeNarrow.lineHeight,
  }),
  type: (wide: boolean, active: boolean) => ({
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wide ? theme.size.chatTypePadX : theme.size.chatTypePadXNarrow,
    borderRadius: theme.radius.chatType,
    backgroundColor: active ? theme.colors.typeActiveFill : 'transparent',
  }),
  typeIcon: (wide: boolean) => ({ marginRight: wide ? theme.size.chatTypeIconGap : theme.size.chatTypeIconGapNarrow }),
  typeText: (wide: boolean, active: boolean) => ({
    ...(wide ? theme.typography.chatType : theme.typography.chatTypeNarrow),
    color: active ? theme.colors.primary : theme.colors.titleText,
    fontWeight: active ? '500' : '400',
  }),
  count: {
    minWidth: theme.size.typeCount,
    height: theme.size.typeCount,
    marginLeft: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xs,
    borderRadius: theme.size.typeCount / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.warning,
  },
  countText: { ...theme.typography.countMini, color: theme.colors.onPrimary },
}));
