import { ChevronRight, X } from 'lucide-react-native';
import { useCallback, useRef, useState } from 'react';
import { ScrollView, type ScrollViewInstance, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import type { StoredDialog } from '../../../sync/messenger';
import { msgPreview } from '../../../sync/messenger/preview';
import { Icon } from '../../../ui/Icon';
import { Confirm } from '../../../ui/popover';
import { showToast } from '../../../ui/Toast';
import { Touchable } from '../../../ui/Touchable';
import { useErrorText } from '../../session';
import { useMsgActions, useUser } from '../hooks';
import { PreviewText } from '../PreviewText';
import { MSG_TYPE_ICONS, MSG_TYPE_LABELS, useMsgFilter, useMsgTypes } from './msgTypes';
import { MyTodoSheet } from './sheets/MyTodoSheet';
import { useTopMsg } from './topMsg';

/**
 * 聊天页标题下的几行（同旧版 App）：分类条（消息 / 待办 / 标注 / 图片 / 文件 / 链接，点了只看这类消息）；
 * 下面是置顶消息（筛选时隐藏），或筛选待办时「我有几条未完成」。置顶、待办行左侧有色条
 */
export function ChatBanners({ dialog, onJump }: { dialog: StoredDialog | undefined; onJump: (msgId: number) => void }) {
  const filter = useMsgFilter(dialog?.id);
  if (!dialog) return null;
  const topId = dialog.top_msg_id ?? 0;
  const todoNum = dialog.todo_num ?? 0;
  return (
    <>
      <TypeBar dialog={dialog} />
      {topId > 0 && !filter && <TopBanner key={topId} dialogId={dialog.id} msgId={topId} pinnerId={dialog.top_userid ?? 0} onJump={onJump} />}
      {todoNum > 0 && filter === 'todo' && <TodoBanner dialogId={dialog.id} count={todoNum} onJump={onJump} />}
    </>
  );
}

/** 分类条：选中的一项滚进可见区域 */
function TypeBar({ dialog }: { dialog: StoredDialog }) {
  const t = useT();
  const { theme } = useUnistyles();
  const { types, selected, select, todoNum } = useMsgTypes(dialog);
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
      {types.map((type) => {
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
              if (active) return;
              reveal(key);
              select(type);
            }}
            style={({ pressed }) => styles.type(active || pressed)}
          >
            <Icon icon={MSG_TYPE_ICONS[key]} color={theme.palette.msgType[key]} size={theme.size.iconTiny} />
            <Text style={styles.typeText(active)}>{t(MSG_TYPE_LABELS[key])}</Text>
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
