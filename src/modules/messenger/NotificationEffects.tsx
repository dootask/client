import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { SlideInUp, SlideOutUp } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { haptics } from '../../platform/haptics';
import { UserAvatar } from '../../ui/Avatar';
import { openDialogRoute } from './DialogList';
import { useIncomingNotices, type IncomingNotice } from './useIncomingNotices';

/** 同旧版：横幅停留 6 秒，上滑超过 10 就收起 */
const DURATION = 6000;
const SWIPE_UP = -10;
const ANIMATION_MS = 300;

/**
 * App：前台收到新消息时顶部弹横幅（同旧版 components/Mobile/Notification.vue），点击打开会话，上滑收起，新的顶掉旧的。
 * 后台时由系统推送提醒，这里不管；旧版只给真人发的消息弹（机器人、系统消息不弹）
 */
export function NotificationEffects() {
  const [notice, setNotice] = useState<Shown | null>(null);
  useIncomingNotices({
    foreground: () => AppState.currentState === 'active',
    allowed: (msg) => msg.userid > 0 && AppState.currentState === 'active',
    onNotice: (next) => setNotice((prev) => ({ ...next, key: (prev?.key ?? 0) + 1 })),
  });
  // 只收起自己这一条：新的已经顶上来时，旧的定时器不能把新的关掉
  const close = useCallback((key: number) => setNotice((prev) => (prev?.key === key ? null : prev)), []);
  if (!notice) return null;
  return <Banner key={notice.key} notice={notice} onClose={close} />;
}

type Shown = IncomingNotice & { key: number };

function Banner({ notice, onClose }: { notice: Shown; onClose: (key: number) => void }) {
  const { theme } = useUnistyles();
  useEffect(() => {
    haptics.notify();
    const timer = setTimeout(() => onClose(notice.key), DURATION);
    return () => clearTimeout(timer);
  }, [notice, onClose]);
  const gesture = useMemo(() => Gesture.Race(
    Gesture.Pan().runOnJS(true).activeOffsetY(SWIPE_UP).onStart(() => onClose(notice.key)),
    Gesture.Tap().runOnJS(true).onEnd(() => {
      onClose(notice.key);
      openDialogRoute(notice.msg.dialog_id);
    }),
  ), [notice, onClose]);
  const { msg, sender, title, body } = notice;
  return (
    <View style={styles.root} pointerEvents="box-none">
      <GestureDetector gesture={gesture}>
        <Animated.View entering={SlideInUp.duration(ANIMATION_MS)} exiting={SlideOutUp.duration(ANIMATION_MS)} style={styles.banner} testID="notify-banner" accessibilityRole="button" accessibilityLabel={`${title} ${body}`}>
          <UserAvatar uri={sender?.userimg} userid={msg.userid} name={sender?.nickname ?? title} bot={sender?.bot === 1} size={theme.size.avatar.lg} />
          <View style={styles.text}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            <Text style={styles.body} numberOfLines={theme.size.notifyBanner.bodyLines}>{body}</Text>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  root: { position: 'absolute', top: rt.insets.top + theme.size.notifyBanner.top, left: 0, right: 0, alignItems: 'center' },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.size.notifyBanner.gap,
    width: { xs: theme.size.notifyBanner.narrowWidth, md: theme.size.notifyBanner.maxWidth },
    padding: theme.size.notifyBanner.pad,
    borderRadius: theme.radius.notifyBanner,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.menuBorder,
    backgroundColor: theme.colors.surface,
    boxShadow: theme.shadow.menuRoomy,
  },
  text: { flex: 1 },
  title: { ...theme.typography.notifyBannerTitle, color: theme.colors.titleText },
  body: { ...theme.typography.notifyBannerBody, color: theme.colors.regularText },
}));
