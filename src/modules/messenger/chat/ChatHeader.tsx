import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { dateFormats, useLanguage, useT } from '../../../i18n';
import { dialogUnread, type StoredDialog } from '../../../sync/messenger';
import { Icon } from '../../../ui/Icon';
import { useSplitView } from '../../../ui/layout';
import { Touchable } from '../../../ui/Touchable';
import { socket } from '../../session';
import { useNow } from '../clock';
import { useMessengerState, useUser } from '../hooks';
import { HeaderRight, HeaderTags } from './ChatHeaderSide';
import { countText, onlineText } from './format';

/** 断线超过这么久才显示「连接中」，短暂重连不闪 */
const CONNECTING_DELAY = 1500;

/**
 * 聊天页导航栏：返回（窄屏，旁边是其他会话的未读）、标题和标签、副标题（群人数 / 对方在线状态 / 连接中）、右侧（会话头像；App 另有电话按钮）。
 * 两侧同宽，标题始终居中；会话数据还没到（深链打开）时只有返回。children 排在导航栏下面、同一块底色里（App 的分类条和横条）
 */
export function ChatHeader({ dialogId, dialog, children }: { dialogId: number; dialog: StoredDialog | undefined; children?: ReactNode }) {
  const split = useSplitView();
  return (
    <View style={styles.root}>
      <View style={styles.bar}>
        <View style={styles.side}>
          {!split && <BackButton dialogId={dialogId} />}
        </View>
        {dialog && (
          <View style={styles.center}>
            <View style={styles.titleRow}>
              <Text style={styles.title} numberOfLines={1}>{dialog.name}</Text>
              <HeaderTags dialog={dialog} />
            </View>
            <Subtitle dialog={dialog} />
          </View>
        )}
        <View style={[styles.side, styles.sideRight]}>
          {dialog && <HeaderRight dialog={dialog} />}
        </View>
      </View>
      {children}
    </View>
  );
}

/** 返回：没有历史（深链、刷新）时回到消息列表；旁边是其他会话的未读合计 */
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
      hitSlop={theme.spacing.sm}
      onPress={() => (router.canGoBack() ? router.back() : router.navigate('/messenger'))}
      style={({ pressed }) => [styles.back, pressed && styles.pressed]}
    >
      <Icon icon={ChevronLeft} color={theme.colors.text} size={theme.size.icon} />
      {others > 0 && (
        <View style={styles.backBadge}>
          <Text style={styles.backBadgeText} allowFontScaling={false}>{countText(others)}</Text>
        </View>
      )}
    </Touchable>
  );
}

function Subtitle({ dialog }: { dialog: StoredDialog }) {
  const t = useT();
  const { theme } = useUnistyles();
  const connecting = useConnecting();
  if (connecting) {
    return (
      <View style={styles.subtitleRow}>
        <ActivityIndicator size="small" color={theme.colors.text3} style={styles.spinner} />
        <Text style={styles.subtitle} numberOfLines={1}>{t('messenger:chat.connecting')}</Text>
      </View>
    );
  }
  if (dialog.type === 'group') {
    if (!dialog.people) return null;
    return <Text style={styles.subtitle} numberOfLines={1}>{t('messenger:chat.members', { n: dialog.people })}</Text>;
  }
  if (dialog.bot) return null;
  return <PeerOnline userid={dialog.dialog_user?.userid ?? 0} />;
}

/** 单聊对方的在线状态：在线带绿点，离线显示最后在线时间 */
function PeerOnline({ userid }: { userid: number }) {
  const t = useT();
  const language = useLanguage();
  const now = useNow();
  const user = useUser(userid);
  if (!user) return null;
  const online = !!user.online;
  const text = onlineText(online, user.line_at, now, t, dateFormats(language));
  if (!text) return null;
  return (
    <View style={styles.subtitleRow}>
      {online && <View style={styles.onlineDot} />}
      <Text style={styles.subtitle} numberOfLines={1}>{text}</Text>
    </View>
  );
}

/** 与服务器断开超过一会儿 */
function useConnecting(): boolean {
  const [connecting, setConnecting] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const update = (state: typeof socket.state) => {
      clearTimeout(timer);
      if (state === 'open' || state === 'idle') setConnecting(false);
      else timer = setTimeout(() => setConnecting(true), CONNECTING_DELAY);
    };
    update(socket.state);
    const off = socket.onState(update);
    return () => {
      clearTimeout(timer);
      off();
    };
  }, []);
  return connecting;
}

const styles = StyleSheet.create((theme, rt) => ({
  root: {
    paddingTop: rt.insets.top,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.separator,
  },
  bar: {
    height: theme.size.navBar,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
  },
  // 两侧都 flex: 1 等宽，标题在正中
  side: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  sideRight: { justifyContent: 'flex-end', paddingRight: theme.spacing.xs },
  center: { flexShrink: 1, maxWidth: '64%', alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  title: { ...theme.typography.title2, color: theme.colors.text, flexShrink: 1 },
  subtitleRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  subtitle: { ...theme.typography.caption, color: theme.colors.text3, flexShrink: 1 },
  spinner: { transform: [{ scale: 0.7 }], width: theme.size.iconSmall, height: theme.size.iconSmall },
  onlineDot: { width: theme.size.dot - 2, height: theme.size.dot - 2, borderRadius: theme.radius.pill, backgroundColor: theme.colors.online },
  back: {
    height: theme.size.touch,
    minWidth: theme.size.touch,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pressed: { opacity: theme.opacity.pressedIcon },
  backBadge: {
    minWidth: theme.spacing.xl,
    paddingHorizontal: theme.spacing.xs + 2,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.fill,
    alignItems: 'center',
  },
  backBadgeText: { ...theme.typography.footnote, color: theme.colors.text2, fontVariant: ['tabular-nums'] },
}));
