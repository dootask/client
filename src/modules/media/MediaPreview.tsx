import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { VideoView, isPictureInPictureSupported, useVideoPlayer, type VideoPlayer } from 'expo-video';
import { PictureInPicture } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, FlatList, Pressable, Text, View } from 'react-native';
import { GestureDetector, GestureHandlerRootView, usePanGesture } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, type SharedValue } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../i18n';
import { AlbumDenied, saveToAlbum, shareFile } from '../../platform/download';
import { Icon } from '../../ui/Icon';
import { showToast, ToastHost } from '../../ui/Toast';
import { closeMedia } from './open';
import { getMediaRequest, setMediaRequest, type PictureItem, type PictureRequest } from './request';
import { ZoomableImage } from './ZoomableImage';
import { dismissProgress, dismissScale, shouldDismiss, type Size } from './zoom';

const RETURN_SPRING = { damping: 24, stiffness: 240, overshootClamping: true };
/** 视频倍速，点一下换下一档 */
const RATES = [1, 1.5, 2, 0.5];
// 画中画在原生配置里声明（app.config.ts 的 expo-video supportsPictureInPicture），设备不支持时不出现入口
const PIP = isPictureInPictureSupported();
/** 超过这么多张时圆点太密，改成「当前 / 总数」 */
const MAX_DOTS = 9;
/** 下载、分享时缓存目录用的键（不按消息分） */
const CACHE_KEY = 'preview';

/**
 * App 的图片、视频查看页（照搬旧版 App）：以透明模态推出，黑底；下拉关闭时背景变透明露出下层页面。
 * 图片左右翻页、翻到最早一张接着取更早的，长按保存、分享、转发；视频用系统播放控件，另有倍速和画中画
 */
export function MediaPreview() {
  const t = useT();
  // 打开时取走请求，之后不再变
  const [request] = useState(getMediaRequest);
  const onClose = useCloseOnce();
  const dismiss = useSharedValue(0);
  const backdropStyle = useAnimatedStyle(() => ({ opacity: 1 - dismiss.get() }));
  useEffect(() => () => setMediaRequest(null), []);

  return (
    <GestureHandlerRootView style={FILL} accessibilityViewIsModal onAccessibilityEscape={onClose}>
      <StatusBar style="light" />
      <Animated.View pointerEvents="none" style={[styles.backdrop, backdropStyle]} />
      {request?.kind === 'pictures' ? (
        <PicturePreview request={request} dismiss={dismiss} onClose={onClose} />
      ) : request?.kind === 'video' ? (
        <VideoPreview url={request.url} dismiss={dismiss} onClose={onClose} />
      ) : (
        <Pressable style={styles.error} onPress={onClose}>
          <Text style={styles.text}>{t('close')}</Text>
        </Pressable>
      )}
      {/* iOS 的模态盖在根布局上面，提示要在这里再挂一个 */}
      <ToastHost />
    </GestureHandlerRootView>
  );
}

/** 下拉、单击等多个入口可能同时触发关闭，只关一次 */
function useCloseOnce() {
  const closed = useRef(false);
  return useCallback(() => {
    if (closed.current) return;
    closed.current = true;
    closeMedia();
  }, []);
}

/** 页面失焦或应用退到后台时暂停视频 */
function useMediaActive() {
  const [focused, setFocused] = useState(false);
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      setForeground(AppState.currentState === 'active');
      return () => setFocused(false);
    }, []),
  );
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => setForeground(state === 'active'));
    return () => subscription.remove();
  }, []);
  return focused && foreground;
}

function Indicator({ count, position, dismiss }: { count: number; position: number; dismiss: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({ opacity: 1 - dismiss.get() }));
  if (count < 2) return null;
  return (
    <Animated.View pointerEvents="none" style={[styles.indicator, style]}>
      {count > MAX_DOTS ? (
        <Text style={styles.counter} accessibilityLiveRegion="polite">
          {position + 1} / {count}
        </Text>
      ) : (
        Array.from({ length: count }, (_item, index) => <View key={index} style={styles.dot(index === position)} />)
      )}
    </Animated.View>
  );
}

function PicturePreview({ request, dismiss, onClose }: { request: PictureRequest; dismiss: SharedValue<number>; onClose: () => void }) {
  const [viewport, setViewport] = useState<Size>({ width: 0, height: 0 });
  const [items, setItems] = useState(request.items);
  const [position, setPosition] = useState(request.position);
  const [pagingEnabled, setPagingEnabled] = useState(true);
  const [menu, setMenu] = useState<PictureItem | null>(null);
  const onZoomChange = useCallback((zoomed: boolean) => setPagingEnabled(!zoomed), []);
  const list = useRef<FlatList<PictureItem>>(null);
  const loading = useRef(false);
  const ended = useRef(!request.loadOlder);

  // 翻到最早一张时接着取更早的，插到前面后保持停在当前这张
  const loadOlder = useCallback(() => {
    if (loading.current || ended.current || !request.loadOlder) return;
    loading.current = true;
    request
      .loadOlder()
      .then((older) => {
        if (older.length === 0) {
          ended.current = true;
          return;
        }
        setItems((current) => [...older, ...current]);
        setPosition((current) => current + older.length);
      })
      .catch(() => {})
      .finally(() => {
        loading.current = false;
      });
  }, [request]);

  useEffect(() => {
    if (position === 0) loadOlder();
  }, [position, loadOlder]);

  useEffect(() => {
    if (viewport.width > 0) list.current?.scrollToOffset({ offset: viewport.width * position, animated: false });
    // 只在前面插入了图（items 变长）时校正位置，翻页时由列表自己滚
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  return (
    <View
      style={FILL}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setViewport((previous) => (previous.width === width && previous.height === height ? previous : { width, height }));
        setPagingEnabled(true);
      }}
    >
      {viewport.width > 0 && viewport.height > 0 && (
        <FlatList
          ref={list}
          // 旋转时重建，初始位置取当前这张，不沿用旧宽度的偏移
          key={`${viewport.width}:${viewport.height}`}
          data={items}
          horizontal
          pagingEnabled
          scrollEnabled={pagingEnabled}
          initialScrollIndex={position}
          initialNumToRender={1}
          maxToRenderPerBatch={2}
          windowSize={3}
          showsHorizontalScrollIndicator={false}
          bounces={false}
          removeClippedSubviews={false}
          keyExtractor={(item, index) => `${index}:${item.url}`}
          getItemLayout={(_data, index) => ({ length: viewport.width, offset: viewport.width * index, index })}
          onMomentumScrollEnd={(event) => {
            const index = Math.max(0, Math.min(items.length - 1, Math.round(event.nativeEvent.contentOffset.x / viewport.width)));
            setPosition(index);
            setPagingEnabled(true);
          }}
          renderItem={({ item, index }) => (
            <ZoomableImage
              uri={item.url}
              viewport={viewport}
              active={position === index}
              dismiss={dismiss}
              onZoomChange={onZoomChange}
              onClose={onClose}
              onLongPress={() => setMenu(item)}
            />
          )}
        />
      )}
      <Indicator count={items.length} position={position} dismiss={dismiss} />
      {menu && <PictureMenu item={menu} onForward={request.onForward} onDismiss={() => setMenu(null)} onClose={onClose} />}
    </View>
  );
}

/** 长按图片的操作：保存到相册、分享，有所属消息时还能转发。查看页固定深色，菜单也是深色 */
function PictureMenu({ item, onForward, onDismiss, onClose }: { item: PictureItem; onForward?: (id: number) => void; onDismiss: () => void; onClose: () => void }) {
  const t = useT();
  const run = (task: () => void) => () => {
    onDismiss();
    task();
  };
  const rows: { label: string; onPress: () => void }[] = [
    {
      label: t('media.save'),
      onPress: run(() => {
        saveToAlbum(CACHE_KEY, item.url)
          .then(() => showToast(t('media.saved')))
          .catch((err) => showToast(t(err instanceof AlbumDenied ? 'media.noAlbum' : 'media.saveFailed')));
      }),
    },
    { label: t('media.share'), onPress: run(() => void shareFile(CACHE_KEY, item.url).catch(() => {})) },
  ];
  const id = item.id;
  if (onForward && id !== undefined) {
    rows.push({
      label: t('media.forward'),
      onPress: run(() => {
        onClose();
        onForward(id);
      }),
    });
  }

  return (
    <Pressable style={styles.menuBackdrop} onPress={onDismiss}>
      <View style={styles.menu}>
        {rows.map((row) => (
          <Pressable key={row.label} onPress={row.onPress} style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}>
            <Text style={styles.menuText}>{row.label}</Text>
          </Pressable>
        ))}
        <View style={styles.menuGap} />
        <Pressable onPress={onDismiss} style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}>
          <Text style={styles.menuText}>{t('cancel')}</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

/** 播放器是原生对象，倍速只能直接赋值 */
function applyRate(player: VideoPlayer, rate: number) {
  player.playbackRate = rate;
}

function VideoPreview({ url, dismiss, onClose }: { url: string; dismiss: SharedValue<number>; onClose: () => void }) {
  const t = useT();
  const { theme } = useUnistyles();
  const active = useMediaActive();
  // 画中画时页面不在前台，视频照常播放
  const [pip, setPip] = useState(false);
  const running = active || pip;
  // 打开即播放；切走时记下是否在播，回来再续上
  const resume = useRef(true);
  const shown = useRef(false);
  const view = useRef<VideoView>(null);
  const player = useVideoPlayer(url, (instance) => {
    instance.loop = false;
    instance.staysActiveInBackground = false;
  });
  const [status, setStatus] = useState(player.status);
  const [playing, setPlaying] = useState(player.playing);
  const [rate, setRate] = useState(1);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);

  useEffect(() => {
    const subscriptions = [
      player.addListener('statusChange', (event) => setStatus(event.status)),
      player.addListener('playingChange', (event) => setPlaying(event.isPlaying)),
    ];
    return () => subscriptions.forEach((subscription) => subscription.remove());
  }, [player]);

  // 进后台与进画中画的先后不定：先进后台被暂停的，进画中画后按记下的状态续上。
  // 小窗收起而页面不在前台：展开回页面的前台状态随后就到，关掉小窗则一直留在后台。先暂停，
  // 很快回到前台的算展开、接着播，否则算不看了（后台不跑 JS 定时器，只能回来时按时间判断）
  const pipClosed = useRef(false);
  const pipEnd = useRef<{ at: number; playing: boolean } | null>(null);
  useEffect(() => {
    const closed = pipClosed.current;
    pipClosed.current = false;
    if (running) {
      const end = pipEnd.current;
      pipEnd.current = null;
      if (end) resume.current = end.playing && Date.now() - end.at < 1000;
      shown.current = true;
      if (resume.current) player.play();
      return;
    }
    if (!shown.current) return;
    if (closed) pipEnd.current = { at: Date.now(), playing: player.playing };
    resume.current = player.playing;
    player.pause();
  }, [running, player]);

  // 只响应向下拖动，横向留给进度条，点击留给系统播放控件
  const pan = usePanGesture({
    maxPointers: 1,
    activeOffsetY: 12,
    failOffsetY: -12,
    failOffsetX: [-20, 20],
    onUpdate: (event) => {
      'worklet';
      dragX.set(event.translationX);
      dragY.set(Math.max(0, event.translationY));
      dismiss.set(dismissProgress(event.translationY));
    },
    onDeactivate: (event) => {
      'worklet';
      if (!event.canceled && shouldDismiss(event.translationY, event.velocityY)) {
        runOnJS(onClose)();
        return;
      }
      dragX.set(withSpring(0, RETURN_SPRING));
      dragY.set(withSpring(0, RETURN_SPRING));
      dismiss.set(withSpring(0, RETURN_SPRING));
    },
  });
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dragX.get() }, { translateY: dragY.get() }, { scale: dismissScale(dismiss.get()) }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View collapsable={false} style={[styles.video, animatedStyle]}>
        <VideoView
          player={player}
          style={FILL}
          nativeControls
          contentFit="contain"
          ref={view}
          fullscreenOptions={{ enable: false }}
          allowsPictureInPicture={PIP}
          startsPictureInPictureAutomatically={PIP && playing}
          onPictureInPictureStart={() => setPip(true)}
          onPictureInPictureStop={() => {
            // 页面已在前台的是展开回来，不必再按时间判断
            pipClosed.current = AppState.currentState !== 'active';
            setPip(false);
          }}
        />
        {PIP && (
          <Pressable
            hitSlop={8}
            accessibilityLabel={t('media.pip')}
            onPress={() => view.current?.startPictureInPicture().catch(() => undefined)}
            style={styles.pip}
          >
            <Icon icon={PictureInPicture} size={theme.size.preview.pipIcon} color={theme.palette.preview.text} />
          </Pressable>
        )}
        <Pressable
          hitSlop={8}
          onPress={() => {
            const next = RATES[(RATES.indexOf(rate) + 1) % RATES.length];
            applyRate(player, next);
            setRate(next);
          }}
          style={styles.rate}
        >
          <Text style={styles.rateText}>{`${rate}x`}</Text>
        </Pressable>
        {status === 'loading' && <ActivityIndicator pointerEvents="none" style={styles.loading} color={theme.palette.preview.text} />}
        {status === 'error' && (
          <View pointerEvents="none" style={styles.error}>
            <Text style={styles.text}>{t('media.videoFailed')}</Text>
          </View>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

const FILL = { flex: 1 };

const styles = StyleSheet.create((theme, rt) => {
  const preview = theme.palette.preview;
  const size = theme.size.preview;
  const chipTop = rt.insets.top + size.chipTop;
  return {
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: preview.bg },
    text: { ...theme.typography.body, color: preview.text },
    video: { flex: 1, paddingTop: rt.insets.top, paddingBottom: rt.insets.bottom },
    loading: { position: 'absolute', alignSelf: 'center', top: '48%' },
    error: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
    indicator: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: rt.insets.bottom + size.indicatorBottom,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: size.dotGap,
    },
    dot: (on: boolean) => ({ width: size.dot, height: size.dot, borderRadius: size.dot / 2, backgroundColor: on ? preview.text : preview.dotOff }),
    counter: { ...theme.typography.subhead, color: preview.text },
    rate: {
      position: 'absolute',
      top: chipTop,
      right: size.chipSide,
      paddingHorizontal: size.rateX,
      paddingVertical: size.rateY,
      borderRadius: theme.radius.pill,
      backgroundColor: preview.chip,
    },
    rateText: { ...theme.typography.previewRate, color: preview.text },
    pip: { position: 'absolute', top: chipTop, left: size.chipSide, padding: size.pipPad, borderRadius: theme.radius.pill, backgroundColor: preview.chip },
    menuBackdrop: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', backgroundColor: preview.menuBackdrop },
    menu: {
      backgroundColor: preview.menu,
      borderTopLeftRadius: size.menuRadius,
      borderTopRightRadius: size.menuRadius,
      paddingTop: size.menuGap,
      paddingBottom: rt.insets.bottom + size.menuGap,
    },
    menuRow: { minHeight: size.menuRow, alignItems: 'center', justifyContent: 'center' },
    menuRowPressed: { backgroundColor: preview.menuPressed },
    menuText: { ...theme.typography.previewMenu, color: preview.text },
    menuGap: { height: size.menuGap, backgroundColor: preview.bg },
  };
});
