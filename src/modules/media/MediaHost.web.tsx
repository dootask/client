import { ChevronLeft, ChevronRight, Maximize, RotateCcw, RotateCw, X, ZoomIn, ZoomOut, type LucideIcon } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { Modal, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../i18n';
import { Icon } from '../../ui/Icon';
import { useBreakpoint } from '../../ui/theme';
import { closeMedia } from './open';
import { useMediaRequest, type PictureRequest } from './request';

/** 宽屏：滚轮每格、工具条每次缩放多少，缩放上下限 */
const WHEEL_STEP = 0.015;
const TOOL_STEP = 0.2;
const MIN_SCALE = 0.2;
const MAX_SCALE = 5;
/** 窄屏：相邻两张的间距（占屏宽的比例）、双击放大倍数、翻页动画时长、松手翻页的距离（占屏宽）、点按的最大移动、双击间隔 */
const SLIDE_GAP = 0.1;
const TAP_ZOOM = 2;
const SLIDE_MS = 250;
const SWIPE_RATIO = 0.2;
const TAP_MOVE = 10;
const DOUBLE_TAP_MS = 250;

const clampScale = (scale: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round(scale * 1000) / 1000));

/**
 * 网页的图片、视频查看层（照旧版网页）：盖在当前页上，Esc 关闭。
 * 宽屏图片有左右切换和底部工具条（缩放、适应、旋转），点遮罩不关；窄屏图片左右滑动翻页、点一下显隐顶栏、双击放大
 */
export function MediaHost() {
  const request = useMediaRequest();
  const wide = useBreakpoint() !== 'xs';
  if (!request) return null;
  return (
    <Modal visible transparent animationType="none" onRequestClose={closeMedia}>
      {request.kind === 'video' ? (
        <VideoLayer url={request.url} wide={wide} />
      ) : wide ? (
        <WidePictures request={request} />
      ) : (
        <NarrowPictures request={request} />
      )}
    </Modal>
  );
}

function RoundButton({ icon, size, label, style, onPress }: { icon: LucideIcon; size: number; label?: string; style: object; onPress: () => void }) {
  const { theme } = useUnistyles();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[styles.round, style]}>
      <Icon icon={icon} size={size} color={theme.palette.preview.text} />
    </Pressable>
  );
}

function WidePictures({ request }: { request: PictureRequest }) {
  const t = useT();
  const { theme } = useUnistyles();
  const { items } = request;
  const [index, setIndex] = useState(request.position);
  const [scale, setScale] = useState(1);
  const [rotate, setRotate] = useState(0);
  const item = items[index];

  const count = items.length;
  const go = useCallback(
    (to: number) => {
      if (to < 0 || to >= count) return;
      setIndex(to);
      setScale(1);
      setRotate(0);
    },
    [count],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') go(index - 1);
      else if (event.key === 'ArrowRight') go(index + 1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [go, index]);

  const tools: { icon: LucideIcon; run: () => void }[][] = [
    [
      { icon: ZoomOut, run: () => setScale((s) => clampScale(s - TOOL_STEP)) },
      { icon: ZoomIn, run: () => setScale((s) => clampScale(s + TOOL_STEP)) },
    ],
    [{ icon: Maximize, run: () => setScale(1) }],
    [
      { icon: RotateCcw, run: () => setRotate((r) => r - 90) },
      { icon: RotateCw, run: () => setRotate((r) => r + 90) },
    ],
  ];
  const size = theme.size.preview;

  return (
    <View style={styles.mask}>
      <div style={CANVAS} onWheel={(event) => setScale((s) => clampScale(s + (event.deltaY < 0 ? WHEEL_STEP : -WHEEL_STEP)))}>
        {item && (
          <img
            key={item.url}
            src={item.url}
            alt={t('media.image')}
            draggable={false}
            style={{ maxWidth: '100%', maxHeight: '100%', transform: `scale(${scale}) rotate(${rotate}deg)`, transition: 'transform 0.2s' }}
          />
        )}
      </div>
      <RoundButton icon={X} size={size.webCloseIcon} label={t('close')} style={styles.close} onPress={closeMedia} />
      {index > 0 && <RoundButton icon={ChevronLeft} size={size.webArrowIcon} style={styles.arrow('left')} onPress={() => go(index - 1)} />}
      {index < items.length - 1 && <RoundButton icon={ChevronRight} size={size.webArrowIcon} style={styles.arrow('right')} onPress={() => go(index + 1)} />}
      <View style={styles.toolbar}>
        {tools.map((group, g) => (
          <View key={g} style={styles.toolGroup(g > 0)}>
            {group.map((tool, i) => (
              <Pressable key={i} accessibilityRole="button" onPress={tool.run}>
                <Icon icon={tool.icon} size={size.webTool} color={theme.palette.preview.text} />
              </Pressable>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

interface Pan {
  id: number;
  x0: number;
  y0: number;
  zx: number;
  zy: number;
  moved: boolean;
}

function NarrowPictures({ request }: { request: PictureRequest }) {
  const t = useT();
  const { theme } = useUnistyles();
  const { width, height } = useWindowDimensions();
  const { items } = request;
  const [index, setIndex] = useState(request.position);
  const [ui, setUi] = useState(true);
  const [zoom, setZoom] = useState({ scale: 1, x: 0, y: 0 });
  const [drag, setDrag] = useState(0);
  const [sliding, setSliding] = useState(false);
  // 手指拖着图时不加过渡，跟手
  const [panning, setPanning] = useState(false);
  const pan = useRef<Pan | null>(null);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastTap = useRef(0);
  const step = width * (1 + SLIDE_GAP);
  const zoomed = zoom.scale > 1;
  useEffect(() => () => clearTimeout(tapTimer.current), []);

  // 放大后拖动不超出图片（按铺满屏幕算）
  const clampPan = (scale: number, x: number, y: number) => {
    const maxX = (width * (scale - 1)) / 2;
    const maxY = (height * (scale - 1)) / 2;
    return { scale, x: Math.max(-maxX, Math.min(maxX, x)), y: Math.max(-maxY, Math.min(maxY, y)) };
  };
  const zoomAt = (px: number, py: number) =>
    setZoom(zoomed ? { scale: 1, x: 0, y: 0 } : clampPan(TAP_ZOOM, -(px - width / 2) * (TAP_ZOOM - 1), -(py - height / 2) * (TAP_ZOOM - 1)));

  const slideTo = (to: number) => {
    const target = to < 0 || to >= items.length ? index : to;
    setSliding(true);
    setDrag((index - target) * step);
    setTimeout(() => {
      setSliding(false);
      setDrag(0);
      setIndex(target);
      setZoom({ scale: 1, x: 0, y: 0 });
    }, SLIDE_MS);
  };

  const onTap = (x: number, y: number) => {
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_MS) {
      clearTimeout(tapTimer.current);
      lastTap.current = 0;
      zoomAt(x, y);
      return;
    }
    lastTap.current = now;
    tapTimer.current = setTimeout(() => setUi((v) => !v), DOUBLE_TAP_MS);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (sliding || pan.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pan.current = { id: event.pointerId, x0: event.clientX, y0: event.clientY, zx: zoom.x, zy: zoom.y, moved: false };
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const p = pan.current;
    if (!p || p.id !== event.pointerId) return;
    const dx = event.clientX - p.x0;
    const dy = event.clientY - p.y0;
    if (!p.moved && Math.hypot(dx, dy) < TAP_MOVE) return;
    if (!p.moved) setPanning(true);
    p.moved = true;
    if (zoomed) setZoom(clampPan(zoom.scale, p.zx + dx, p.zy + dy));
    else setDrag(dx);
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const p = pan.current;
    if (!p || p.id !== event.pointerId) return;
    pan.current = null;
    setPanning(false);
    if (!p.moved) onTap(event.clientX, event.clientY);
    else if (!zoomed) slideTo(Math.abs(drag) > width * SWIPE_RATIO ? index + (drag < 0 ? 1 : -1) : index);
  };

  const size = theme.size.preview;
  const slides = [index - 1, index, index + 1].filter((i) => i >= 0 && i < items.length);

  return (
    <View style={styles.mask}>
      <div
        style={{ ...CANVAS, touchAction: 'none', overflow: 'hidden' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          pan.current = null;
          setPanning(false);
          if (!zoomed) slideTo(index);
        }}
      >
        {slides.map((i) => {
          const current = i === index;
          return (
            <div
              key={`${i}:${items[i].url}`}
              style={{
                position: 'absolute',
                inset: 0,
                transform: `translateX(${(i - index) * step + drag}px)`,
                transition: sliding ? `transform ${SLIDE_MS}ms` : undefined,
              }}
            >
              <img
                src={items[i].url}
                alt={t('media.image')}
                draggable={false}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  transform: current ? `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.scale})` : undefined,
                  transition: panning ? undefined : 'transform 0.2s',
                }}
              />
            </div>
          );
        })}
      </div>
      {ui && (
        <View style={styles.topBar}>
          {items.length > 1 && (
            <Text style={styles.counter}>
              {index + 1} / {items.length}
            </Text>
          )}
          <View style={styles.topActions}>
            <Pressable accessibilityRole="button" style={styles.topButton} onPress={() => zoomAt(width / 2, height / 2)}>
              <Icon icon={zoomed ? ZoomOut : ZoomIn} size={size.webTopIcon} color={theme.palette.preview.text} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={t('close')} style={styles.topButton} onPress={closeMedia}>
              <Icon icon={X} size={size.webTopIcon} color={theme.palette.preview.text} />
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

/** 视频：浏览器自带的播放控件（倍速、画中画、全屏都在里面），打开即播。宽屏同旧版浮在页面中间、不加遮罩 */
function VideoLayer({ url, wide }: { url: string; wide: boolean }) {
  const t = useT();
  const { theme } = useUnistyles();
  const size = theme.size.preview;
  return (
    <View style={styles.videoRoot(wide)}>
      <video src={url} controls autoPlay preload="metadata" style={wide ? { width: size.webVideoWidth, height: size.webVideoHeight } : { width: '100%' }} />
      {wide ? (
        <RoundButton icon={X} size={size.webCloseIcon} label={t('close')} style={styles.close} onPress={closeMedia} />
      ) : (
        <View style={styles.topBar}>
          <View style={styles.topActions}>
            <Pressable accessibilityRole="button" accessibilityLabel={t('close')} style={styles.topButton} onPress={closeMedia}>
              <Icon icon={X} size={size.webTopIcon} color={theme.palette.preview.text} />
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const CANVAS = { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', userSelect: 'none' } as const;

const styles = StyleSheet.create((theme) => {
  const preview = theme.palette.preview;
  const size = theme.size.preview;
  return {
    mask: { ...StyleSheet.absoluteFillObject, backgroundColor: preview.webMask },
    videoRoot: (wide: boolean) => ({
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: wide ? 'transparent' : preview.webMask,
    }),
    round: { position: 'absolute', borderRadius: theme.radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: preview.webButton },
    close: { top: size.webEdge, right: size.webEdge, width: size.webClose, height: size.webClose },
    arrow: (side: 'left' | 'right') => ({
      [side]: size.webEdge,
      top: '50%',
      marginTop: -size.webArrow / 2,
      width: size.webArrow,
      height: size.webArrow,
      opacity: theme.opacity.previewButton,
    }),
    toolbar: {
      position: 'absolute',
      bottom: size.webToolbarBottom,
      alignSelf: 'center',
      height: size.webToolbar,
      paddingHorizontal: size.webToolbarPadX,
      borderRadius: size.webToolbar / 2,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: preview.webButton,
      opacity: theme.opacity.previewButton,
    },
    toolGroup: (separated: boolean) => ({ flexDirection: 'row', gap: size.webToolGap, marginLeft: separated ? size.webToolGap + size.webToolSep : 0 }),
    topBar: { position: 'absolute', top: 0, left: 0, right: 0, height: size.webTopBar, flexDirection: 'row' },
    counter: {
      ...theme.typography.previewCounter,
      position: 'absolute',
      top: size.webCounterTop,
      left: size.webCounterLeft,
      color: preview.text,
      opacity: theme.opacity.previewCounter,
    },
    topActions: { marginLeft: 'auto', flexDirection: 'row' },
    topButton: { width: size.webTopButton, height: size.webTopBar, alignItems: 'center', justifyContent: 'center', opacity: theme.opacity.previewCounter },
  };
});
