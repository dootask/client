import { ChevronRight, FileText, Image, Link2, ListTodo, type LucideIcon, MessageSquare, Tag, X } from 'lucide-react-native';
import { useCallback, useRef, useState } from 'react';
import { ScrollView, type ScrollViewInstance, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import type { StoredDialog } from '../../../sync/messenger';
import type { MsgFilterType } from '../../../sync/messenger/rules';
import { msgPreview } from '../../../sync/messenger/preview';
import { Icon } from '../../../ui/Icon';
import { Confirm } from '../../../ui/popover';
import { showToast } from '../../../ui/Toast';
import { Touchable } from '../../../ui/Touchable';
import { useErrorText } from '../../session';
import { useMessenger, useMessengerState, useMsgActions, useUser } from '../hooks';
import { PreviewText } from '../PreviewText';
import { MyTodoSheet } from './sheets/MyTodoSheet';
import { useTopMsg } from './topMsg';

type Filter = MsgFilterType | null;

/** 分类条的顺序（同旧版）：待办排在标注前面 */
const TYPE_ORDER: MsgFilterType[] = ['todo', 'tag', 'image', 'file', 'link'];
const TYPE_ICONS: Record<MsgFilterType | 'msg', LucideIcon> = { msg: MessageSquare, todo: ListTodo, tag: Tag, image: Image, file: FileText, link: Link2 };
const TYPE_LABELS = {
  msg: 'messenger:filter.msg',
  todo: 'messenger:filter.todo',
  tag: 'messenger:filter.tag',
  image: 'messenger:filter.image',
  file: 'messenger:filter.file',
  link: 'messenger:filter.link',
} as const;
const HAS_TYPE: Record<MsgFilterType, keyof StoredDialog> = { todo: 'has_todo', tag: 'has_tag', image: 'has_image', file: 'has_file', link: 'has_link' };

/**
 * 聊天页标题下的几行（同旧版 App）：分类条（消息 / 待办 / 标注 / 图片 / 文件 / 链接，点了只看这类消息）；
 * 下面是置顶消息（筛选时隐藏），或筛选待办时「我有几条未完成」。置顶、待办行左侧有色条
 */
export function ChatBanners({ dialog, onJump }: { dialog: StoredDialog | undefined; onJump: (msgId: number) => void }) {
  const messenger = useMessenger();
  const errorText = useErrorText();
  const filter = useMessengerState((s) => (dialog && s.filter?.dialogId === dialog.id ? s.filter.type : null));
  if (!dialog) return null;
  const topId = dialog.top_msg_id ?? 0;
  const todoNum = dialog.todo_num ?? 0;
  const onFilter = (type: Filter) => void messenger?.setFilter(dialog.id, type).catch((err) => showToast(errorText(err)));
  return (
    <>
      <TypeBar dialog={dialog} filter={filter} onFilter={onFilter} />
      {topId > 0 && !filter && <TopBanner key={topId} dialogId={dialog.id} msgId={topId} pinnerId={dialog.top_userid ?? 0} onJump={onJump} />}
      {todoNum > 0 && filter === 'todo' && <TodoBanner dialogId={dialog.id} count={todoNum} onJump={onJump} />}
    </>
  );
}

/**
 * 分类条：会话里有哪类消息才列哪类（标记来自会话数据）；正在筛的一类即使没了也保留，才能切回。
 * 「待办」带我未完成的条数。只有「消息」一项时不显示
 */
function TypeBar({ dialog, filter, onFilter }: { dialog: StoredDialog; filter: Filter; onFilter: (type: Filter) => void }) {
  const t = useT();
  const { theme } = useUnistyles();
  const todoNum = dialog.todo_num ?? 0;
  const types = TYPE_ORDER.filter((type) => !!dialog[HAS_TYPE[type]] || type === filter || (type === 'todo' && todoNum > 0));
  // 选中的一项先高亮，不等筛选结果回来
  const [selected, setSelected] = useState<Filter>(filter);
  const [prevFilter, setPrevFilter] = useState<Filter>(filter);
  if (filter !== prevFilter) {
    setPrevFilter(filter);
    setSelected(filter);
  }
  // 选中的一项滚进可见区域
  const scrollRef = useRef<ScrollViewInstance>(null);
  const view = useRef({ x: 0, width: 0 });
  const items = useRef(new Map<string, { x: number; width: number }>());
  const reveal = (key: string) => {
    const item = items.current.get(key);
    const { x, width } = view.current;
    if (!item || !width) return;
    if (item.x < x) scrollRef.current?.scrollTo({ x: item.x - theme.spacing.page, animated: true });
    else if (item.x + item.width > x + width) scrollRef.current?.scrollTo({ x: item.x + item.width - width + theme.spacing.page, animated: true });
  };
  if (types.length === 0) return null;
  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.types}
      onLayout={(e) => (view.current.width = e.nativeEvent.layout.width)}
      onScroll={(e) => (view.current.x = e.nativeEvent.contentOffset.x)}
      scrollEventThrottle={64}
    >
      {[null, ...types].map((type) => {
        const key = type ?? 'msg';
        const active = type === selected;
        const count = type === 'todo' ? todoNum : 0;
        return (
          <Touchable
            key={key}
            accessibilityRole="tab"
            aria-selected={active}
            onLayout={(e) => items.current.set(key, { x: e.nativeEvent.layout.x, width: e.nativeEvent.layout.width })}
            onPress={() => {
              if (type === selected) return;
              setSelected(type);
              reveal(key);
              onFilter(type);
            }}
            style={({ pressed }) => styles.type(active || pressed)}
          >
            <Icon icon={TYPE_ICONS[key]} color={theme.palette.msgType[key]} size={theme.size.iconTiny} />
            <Text style={styles.typeText(active)}>{t(TYPE_LABELS[key])}</Text>
            {count > 0 && (
              <View style={styles.count}>
                <Text style={styles.countText} allowFontScaling={false}>{count > 99 ? '99+' : count}</Text>
              </View>
            )}
          </Touchable>
        );
      })}
    </ScrollView>
  );
}

function TopBanner({ dialogId, msgId, pinnerId, onJump }: { dialogId: number; msgId: number; pinnerId: number; onJump: (msgId: number) => void }) {
  const t = useT();
  const { theme } = useUnistyles();
  const actions = useMsgActions();
  const errorText = useErrorText();
  const msg = useTopMsg(dialogId, msgId);
  const sender = useUser(msg?.userid ?? 0)?.nickname;
  const pinner = useUser(pinnerId)?.nickname;
  const preview = msgPreview(msg);

  return (
    <Touchable accessibilityRole="button" onPress={() => onJump(msgId)} style={({ pressed }) => styles.bar(pressed)}>
      <View style={styles.accent(theme.colors.primary)} />
      <Text style={styles.text} numberOfLines={1}>
        {!!sender && <Text style={styles.sender}>{sender}: </Text>}
        {preview ? <PreviewText preview={preview} /> : ' '}
      </Text>
      {msg && (
        <Confirm
          title={t('messenger:top.unpinConfirm')}
          message={pinner ? t('messenger:top.by', { name: pinner }) : undefined}
          accessibilityLabel={t('messenger:action.unpin')}
          onConfirm={() => void actions?.toggleTop(msg).catch((err) => showToast(errorText(err)))}
          style={({ pressed }) => styles.close(pressed)}
        >
          <Icon icon={X} color={theme.colors.text3} size={theme.size.bannerClose} />
        </Confirm>
      )}
    </Touchable>
  );
}

function TodoBanner({ dialogId, count, onJump }: { dialogId: number; count: number; onJump: (msgId: number) => void }) {
  const t = useT();
  const { theme } = useUnistyles();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <Touchable accessibilityRole="button" onPress={() => setOpen(true)} style={({ pressed }) => styles.bar(pressed)}>
        <View style={styles.accent(theme.colors.warning)} />
        <Text style={[styles.text, styles.strong]} numberOfLines={1}>{t('messenger:todos.mine', { n: count })}</Text>
        <Text style={styles.go}>{t('messenger:todos.go')}</Text>
        <Icon icon={ChevronRight} color={theme.colors.primaryText} size={theme.size.bannerClose} />
      </Touchable>
      {open && <MyTodoSheet dialogId={dialogId} visible onClose={close} onJump={onJump} />}
    </>
  );
}

const styles = StyleSheet.create((theme) => ({
  types: { flexDirection: 'row', gap: theme.spacing.xs, paddingHorizontal: theme.spacing.page, paddingBottom: theme.spacing.sm },
  type: (on: boolean) => ({
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    height: theme.size.typeChip,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.pill,
    backgroundColor: on ? theme.colors.primarySoft : 'transparent',
  }),
  typeText: (active: boolean) => ({
    ...theme.typography.footnote,
    color: active ? theme.colors.primaryText : theme.colors.text2,
    fontWeight: active ? '600' : '400',
  }),
  count: {
    minWidth: theme.size.typeCount,
    height: theme.size.typeCount,
    paddingHorizontal: theme.spacing.xs,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.warning,
  },
  countText: { ...theme.typography.countMini, color: theme.colors.onPrimary },
  bar: (pressed: boolean) => ({
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    height: theme.size.banner,
    paddingHorizontal: theme.spacing.page,
    backgroundColor: pressed ? theme.colors.fillPressed : 'transparent',
  }),
  accent: (color: string) => ({
    width: theme.size.bannerAccent,
    alignSelf: 'stretch',
    marginVertical: theme.spacing.sm,
    borderRadius: theme.radius.swatch,
    backgroundColor: color,
  }),
  text: { ...theme.typography.footnote, flex: 1, color: theme.colors.text },
  strong: { ...theme.typography.footnoteStrong },
  sender: { ...theme.typography.footnoteStrong, color: theme.colors.primaryText },
  go: { ...theme.typography.footnoteStrong, color: theme.colors.primaryText },
  close: (pressed: boolean) => ({ opacity: pressed ? theme.opacity.pressedIcon : 1 }),
}));
