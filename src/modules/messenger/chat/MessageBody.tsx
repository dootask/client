import { Image } from 'expo-image';
import type { LucideIcon } from 'lucide-react-native';
import {
  File, FileArchive, FileCode, FileImage, FileMusic, FileSpreadsheet, FileText, FileVideoCamera, Film, Pause, Play, Presentation, X,
} from 'lucide-react-native';
import { useEffect, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import type { LocalFile } from '../../../sync/api';
import type { MsgBody } from '../../../sync/messenger/body';
import { Icon } from '../../../ui/Icon';
import type { AppTheme } from '../../../ui/theme';
import { CardBody } from './cards/CardBody';
import { formatBytes } from './bytes';
import { useFileProgress } from './fileActions';
import { formatSeconds } from './format';
import { fitSize, MEDIA_BOX, STICKER_BOX } from './media';
import { RichBlocks, type BubbleTone } from './RichText';
import { LongMore } from './LongMore';
import { useVoiceProgress } from './voice';

type Body<K extends MsgBody['kind']> = Extract<MsgBody, { kind: K }>;

/** 不套文字气泡内边距、内容铺满气泡的消息体 */
export const isMediaBody = (body: MsgBody): body is Body<'image' | 'video'> => body.kind === 'image' || body.kind === 'video';

export const isStickerBody = (body: MsgBody): body is Body<'rich'> => body.kind === 'rich' && !!body.sticker;

/** 图片、视频：按比例占位，图片晚到不改变高度；overlay 放时间浮层 */
export function MediaBody({ body, overlay }: { body: Body<'image' | 'video'>; overlay?: ReactNode }) {
  const { theme } = useUnistyles();
  const box = fitSize(body.width, body.height, MEDIA_BOX);
  return (
    <View style={[box, styles.media]}>
      <Image source={body.src} style={StyleSheet.absoluteFill} contentFit="cover" recyclingKey={body.src} cachePolicy="memory-disk" transition={150} />
      {body.kind === 'video' && (
        <View style={styles.center}>
          <View style={styles.play}>
            <Icon icon={Play} color={theme.colors.onMedia} size={theme.size.icon} />
          </View>
        </View>
      )}
      {overlay}
    </View>
  );
}

/** 发送中的图片、视频：本地图按发出后的尺寸占位（视频本地没有封面，画一个图标）；children 盖在中间 */
export function LocalMedia({ file, children }: { file: LocalFile; children?: ReactNode }) {
  const { theme } = useUnistyles();
  const media = file.media!;
  const box = fitSize(media.width, media.height, MEDIA_BOX);
  return (
    <View style={[box, styles.media]}>
      {media.kind === 'image' ? (
        <Image source={file.uri} style={StyleSheet.absoluteFill} contentFit="cover" recyclingKey={file.uri} />
      ) : (
        <View style={[styles.center, styles.localVideo]}>
          <Icon icon={Film} color={theme.colors.onMedia} size={theme.size.icon} />
        </View>
      )}
      <View style={styles.center}>{children}</View>
    </View>
  );
}

/** 只有一张表情图：不套气泡 */
export function StickerBody({ body }: { body: Body<'rich'> }) {
  const img = body.blocks[0];
  if (img?.t !== 'img') return null;
  return <Image source={img.src} style={fitSize(img.width, img.height, STICKER_BOX)} contentFit="contain" recyclingKey={img.src} cachePolicy="memory-disk" />;
}

/**
 * 文字气泡里的消息体（图片、视频、表情另见 MediaBody、StickerBody）
 */
export function MessageBody({ body, tone, unplayed, msgId }: {
  body: MsgBody;
  tone: BubbleTone;
  /** 已发出的消息 ID（App 上文件下载进度按它显示） */
  msgId?: number;
  /** 语音没听过（显示红点） */
  unplayed?: boolean;
}) {
  const t = useT();
  switch (body.kind) {
    case 'rich':
      return (
        <>
          <RichBlocks blocks={body.blocks} tone={tone} />
          {body.long && <LongMore msgId={msgId} tone={tone} />}
        </>
      );
    case 'typing':
      return <TypingDots color={tone.muted} />;
    case 'image':
    case 'video':
      return <MediaBody body={body} />;
    case 'file':
      return msgId ? <MsgFile msgId={msgId} body={body} tone={tone} /> : <FileCard name={body.name} ext={body.ext} size={body.size} tone={tone} />;
    case 'record':
      return <RecordBody url={body.url} duration={body.duration} text={body.text} tone={tone} unplayed={unplayed} />;
    case 'vote':
    case 'wordChain':
    case 'location':
    case 'meeting':
    case 'mergeForward':
    case 'template':
      return <CardBody body={body} tone={tone} />;
    case 'system':
    case 'unknown':
      return <Text style={[styles.body, styles.italic, { color: tone.muted }]}>{t('messenger:chat.unknown')}</Text>;
  }
}

type TileKind = keyof AppTheme['palette']['tile'];

const FILE_KINDS: [TileKind, LucideIcon, string[]][] = [
  ['pdf', FileText, ['pdf']],
  ['doc', FileText, ['doc', 'docx', 'wps', 'txt', 'md', 'rtf', 'pages']],
  ['sheet', FileSpreadsheet, ['xls', 'xlsx', 'csv', 'et', 'numbers']],
  ['slide', Presentation, ['ppt', 'pptx', 'dps', 'key']],
  ['archive', FileArchive, ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz']],
  ['image', FileImage, ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'heic', 'psd']],
  ['video', FileVideoCamera, ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'wmv']],
  ['audio', FileMusic, ['mp3', 'wav', 'm4a', 'aac', 'amr', 'flac', 'ogg']],
  ['code', FileCode, ['js', 'ts', 'json', 'php', 'py', 'java', 'go', 'html', 'css', 'sh', 'xml', 'yml', 'yaml', 'sql', 'c', 'cpp', 'swift', 'kt']],
];

/** 文件扩展名对应的色块种类和图标 */
function fileKind(ext: string): [TileKind, LucideIcon] {
  const lower = ext.toLowerCase();
  const found = FILE_KINDS.find(([, , exts]) => exts.includes(lower));
  return found ? [found[0], found[1]] : ['other', File];
}

/** 已发出的文件（同旧版 App）：下载中色块自下而上填充、图标换成取消，大小换成「已下 / 总大小」 */
function MsgFile({ msgId, body, tone }: { msgId: number; body: Body<'file'>; tone: BubbleTone }) {
  const progress = useFileProgress(msgId);
  return <FileCard name={body.name} ext={body.ext} size={body.size} tone={tone} progress={progress ?? undefined} />;
}

/** 文件：左侧色块图标，右侧文件名和大小；发送中色块上换成进度（tile），下载中带进度（progress，0–1） */
export function FileCard({ name, ext, size, tone, tile, progress }: {
  name: string; ext: string; size: number; tone: BubbleTone; tile?: ReactNode; progress?: number;
}) {
  const { theme } = useUnistyles();
  const [kind, icon] = fileKind(ext);
  const loading = progress !== undefined;
  return (
    <View style={styles.fileCard}>
      <View style={[styles.tile, { backgroundColor: theme.palette.tile[kind] }]}>
        {loading && <View style={[styles.tileFill, { height: `${progress * 100}%` }]} />}
        {tile ?? <Icon icon={loading ? X : icon} color={theme.palette.onTile} size={theme.size.icon} />}
      </View>
      <View style={styles.fileText}>
        <Text style={[styles.fileName, { color: tone.text }]} numberOfLines={2}>{name}</Text>
        <Text style={[styles.caption, { color: tone.muted }]}>{loading ? `${formatBytes(size * progress)} / ${formatBytes(size)}` : formatBytes(size)}</Text>
      </View>
    </View>
  );
}

/** 语音：宽度随时长增长，点气泡播放 / 停止，播放时进度条走动、时间显示剩余；转写文字在下方；没听过的有红点 */
export function RecordBody({ url, duration, text, tone, unplayed }: {
  url: string; duration: number; text: string; tone: BubbleTone; unplayed?: boolean;
}) {
  const { theme } = useUnistyles();
  const progress = useVoiceProgress(url);
  const seconds = Math.max(1, Math.round(duration / 1000));
  const shown = progress === null ? seconds : Math.max(0, Math.ceil(seconds * (1 - progress)));
  return (
    <View style={styles.recordWrap}>
      <View style={styles.record(seconds)}>
        <View style={[styles.voicePlay, { backgroundColor: tone.accent }]}>
          <Icon icon={progress === null ? Play : Pause} color={theme.palette.onTile} size={theme.size.iconSmall} />
        </View>
        <View style={[styles.track, { backgroundColor: tone.overlay }]}>
          <View style={[styles.trackFill(progress ?? 0), { backgroundColor: tone.accent }]} />
        </View>
        <Text style={[styles.recordTime, { color: tone.muted }]}>{formatSeconds(shown)}</Text>
        {unplayed && progress === null && <View style={[styles.dot, { backgroundColor: tone.danger }]} />}
      </View>
      {!!text && (
        <>
          <View style={[styles.divider, { backgroundColor: tone.separator }]} />
          <Text style={[styles.body, { color: tone.text }]}>{text}</Text>
        </>
      )}
    </View>
  );
}

/** AI 回复还没有内容时的三个跳动点 */
function TypingDots({ color }: { color: string }) {
  return (
    <View style={styles.typing}>
      {[0, 1, 2].map((i) => <Dot key={i} index={i} color={color} />)}
    </View>
  );
}

function Dot({ index, color }: { index: number; color: string }) {
  const opacity = useSharedValue(0.3);
  useEffect(() => {
    opacity.value = withDelay(index * 160, withRepeat(withSequence(withTiming(1, { duration: 360 }), withTiming(0.3, { duration: 360 })), -1));
  }, [index, opacity]);
  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[styles.typingDot, { backgroundColor: color }, animated]} />;
}

const styles = StyleSheet.create((theme) => ({
  body: { ...theme.typography.body },
  caption: { ...theme.typography.caption },
  italic: { fontStyle: 'italic' },
  // 外层气泡留了 xs 内边距，圆角相应收一点，和气泡同心
  media: { borderRadius: theme.radius.bubble - theme.spacing.xs, overflow: 'hidden', backgroundColor: theme.colors.bubbleOverlay },
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  localVideo: { backgroundColor: theme.colors.mediaScrim },
  play: {
    width: theme.size.mediaPlay, height: theme.size.mediaPlay, borderRadius: theme.radius.pill,
    alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.mediaScrim,
  },
  fileCard: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, minWidth: theme.size.bubbleMaxWidth - theme.size.bubbleFarGap * 2 },
  tile: {
    width: theme.size.fileTile, height: theme.size.fileTile, borderRadius: theme.radius.block,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  tileFill: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: theme.palette.tileProgress },
  fileText: { flexShrink: 1, gap: 2 },
  fileName: { ...theme.typography.callout },
  recordWrap: { gap: theme.spacing.sm },
  // 宽度随时长增长：一秒多 3，最多多 120
  record: (seconds: number) => ({
    width: theme.size.voicePlay * 3.5 + Math.min(120, seconds * 3),
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  }),
  voicePlay: { width: theme.size.voicePlay, height: theme.size.voicePlay, borderRadius: theme.radius.pill, alignItems: 'center', justifyContent: 'center' },
  track: { flex: 1, height: theme.size.voiceTrack, borderRadius: theme.radius.pill, overflow: 'hidden' },
  trackFill: (progress: number) => ({ height: theme.size.voiceTrack, width: `${progress * 100}%` }),
  recordTime: { ...theme.typography.subhead, fontVariant: ['tabular-nums'] },
  dot: { width: theme.size.dot, height: theme.size.dot, borderRadius: theme.radius.pill },
  divider: { height: StyleSheet.hairlineWidth },
  typing: { flexDirection: 'row', gap: theme.spacing.xs, height: theme.typography.body.lineHeight, alignItems: 'center' },
  typingDot: { width: theme.size.dot - 1, height: theme.size.dot - 1, borderRadius: theme.radius.pill },
}));
