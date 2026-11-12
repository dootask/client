import {
  getRecordingPermissionsAsync, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState,
  type AudioRecorder, type RecordingOptions,
} from 'expo-audio';
import { ArrowUp, Languages, Lock, X, type LucideIcon } from 'lucide-react-native';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import { recordedFile } from '../../../platform/files';
import { haptics } from '../../../platform/haptics';
import { KeepFocus, measureInWindow } from '../../../ui/chat';
import { Icon } from '../../../ui/Icon';
import { showToast } from '../../../ui/Toast';
import { Touchable } from '../../../ui/Touchable';
import { useErrorText } from '../../session';
import { useMessenger } from '../hooks';
import type { ComposerMode } from './Composer';
import { stopVoice } from './voice';
import { HOLD_TO_TALK, WEB_MIME_TYPE } from './voiceTraits';

/** 手指所在的去向：松手发送、取消、转文字，或锁定（松手后继续录） */
type Zone = 'send' | 'cancel' | 'convert' | 'lock';
type TargetZone = Exclude<Zone, 'send'>;
type Finish = Exclude<Zone, 'lock'>;

interface Hold {
  /** 0 表示还在准备录音 */
  startedAt: number;
  timer?: ReturnType<typeof setTimeout>;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 与旧网页一致：最长 3 分钟，到时自动发送 */
const MAX_DURATION = 180_000;
const COUNTDOWN_FROM = 10_000;
/** 接口要求的最短时长 */
const MIN_DURATION = 600;
/** 短于这个时长是点了一下，提示要按住 */
const TAP_DURATION = 200;
/** 手指离按钮边缘多近就算滑到了按钮上 */
const TARGET_SLOP = 8;
/**
 * 单声道低码率：说话够用，3 分钟约 1MB；浏览器录 AAC（服务端不收 webm）。
 * 浏览器上不给 bitsPerSecond：那是音视频总码率，Chrome 只分给音频一成（约 5kbps）；不给时 bitRate 整个给音频
 */
const RECORD_OPTIONS: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  sampleRate: 22050,
  numberOfChannels: 1,
  bitRate: 48000,
  isMeteringEnabled: true,
  web: { mimeType: WEB_MIME_TYPE },
};

/** 手指（窗口坐标）所在的去向按钮，不在任何按钮上为发送 */
function zoneAt(rects: Partial<Record<TargetZone, Rect>>, x: number, y: number): Zone {
  for (const [zone, rect] of Object.entries(rects) as [TargetZone, Rect][]) {
    if (x >= rect.x - TARGET_SLOP && x <= rect.x + rect.width + TARGET_SLOP && y >= rect.y - TARGET_SLOP && y <= rect.y + rect.height + TARGET_SLOP) return zone;
  }
  return 'send';
}

export interface VoiceInput {
  /** 语音模式（按住说话的长条顶替输入框） */
  mode: boolean;
  setMode: (on: boolean) => void;
  /** 按住说话的长条 */
  bar: ReactNode;
  /** 录音、转文字时输入栏上方的浮层，其余时候为 null */
  hud: ReactNode;
  /** 直接开始录（锁定状态，在浮层里选去向）：点按录音的平台用 */
  start: () => void;
}

/**
 * 语音输入（照搬 resources/app）：按住长条录音，松开发送；浮层里有取消、锁定、转文字三个按钮，
 * 手指滑到哪个按钮上就选中哪个（震一下），滑出按钮回到发送，以松手时的位置为准。
 * 锁定后继续录，之后在浮层里点取消、转文字或发送。语音和文件同一个发送队列，正在回复时带上回复
 */
export function useVoiceInput({ dialogId, mode: composerMode, threadId, onModeEnd, onSent, onConverted }: {
  dialogId: number;
  mode: ComposerMode;
  /** 回复线程里（F7）发出的都回复这条，见 useComposer */
  threadId: number;
  onModeEnd: () => void;
  onSent: () => void;
  /** 转好的文字（放进输入框） */
  onConverted: (text: string) => void;
}): VoiceInput {
  const t = useT();
  const { theme } = useUnistyles();
  const errorText = useErrorText();
  const messenger = useMessenger();
  const recorder = useAudioRecorder(RECORD_OPTIONS);
  const [voiceMode, setVoiceMode] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'recording' | 'converting'>('idle');
  const [zone, setZone] = useState<Zone>('send');
  const [locked, setLocked] = useState(false);
  const [startedAt, setStartedAt] = useState(0);
  const holdRef = useRef<Hold | null>(null);
  const zoneRef = useRef<Zone>('send');
  // 去向按钮在窗口里的位置，按住时手指坐标与它比对
  const targetRects = useRef<Partial<Record<TargetZone, Rect>>>({});
  const onTargetLayout = useCallback((target: TargetZone, rect: Rect) => {
    targetRects.current[target] = rect;
  }, []);
  const latest = useRef({ messenger, dialogId, composerMode, threadId, onModeEnd, onSent, onConverted, errorText });
  useLayoutEffect(() => {
    latest.current = { messenger, dialogId, composerMode, threadId, onModeEnd, onSent, onConverted, errorText };
  });

  // 停止录音后才能再次准备，否则原生报已准备
  const settling = useRef<Promise<unknown>>(Promise.resolve());
  const stopRecorder = useCallback(() => {
    const stopped = recorder.stop();
    settling.current = stopped.catch(() => {});
    return stopped;
  }, [recorder]);

  const finish = useCallback(async (action: Finish) => {
    const hold = holdRef.current;
    holdRef.current = null;
    setLocked(false);
    // 还没开始录就松手的情况由 press 收尾
    if (!hold?.startedAt) return;
    clearTimeout(hold.timer);
    const duration = Date.now() - hold.startedAt;
    const tooShort = duration < MIN_DURATION;
    setPhase(action === 'convert' && !tooShort ? 'converting' : 'idle');
    try {
      await stopRecorder();
    } catch {
      setPhase('idle');
      showToast(t('messenger:chat.operationFailed'));
      return;
    } finally {
      // 不恢复的话 iOS 之后的播放会走听筒
      setAudioModeAsync({ allowsRecording: false }).catch(() => {});
    }
    const uri = recorder.uri;
    if (!uri) {
      setPhase('idle');
      return;
    }
    // 录音文件在缓存里，交给系统清理
    if (action === 'cancel' || tooShort) {
      if (action !== 'cancel') showToast(t(duration < TAP_DURATION ? 'messenger:record.hold' : 'messenger:record.tooShort'));
      return;
    }
    const { messenger: current, dialogId: id, composerMode: mode, threadId: thread, onModeEnd: endMode, onSent: sent, onConverted: converted, errorText: describe } = latest.current;
    if (!current) return;
    const file = await recordedFile(uri);
    if (action === 'send') {
      const replyId = mode?.kind === 'reply' ? mode.msg.id : thread || undefined;
      if (mode?.kind === 'reply') endMode();
      current.sendRecord({ dialog_id: id, file, duration, reply_id: replyId });
      sent();
      return;
    }
    try {
      const text = (await current.convertRecord({ dialog_id: id, file, duration })).trim();
      if (text) converted(text);
      else showToast(t('messenger:record.convertFailed'));
    } catch (err) {
      showToast(describe(err));
    } finally {
      setPhase('idle');
    }
  }, [recorder, stopRecorder, t]);

  /** 开始录：lock 时直接进锁定状态（点按录音） */
  const press = useCallback(async (lock: boolean) => {
    const hold: Hold = { startedAt: 0 };
    holdRef.current = hold;
    zoneRef.current = 'send';
    targetRects.current = {};
    setZone('send');
    try {
      const permission = await getRecordingPermissionsAsync();
      if (!permission.granted) {
        // 授权弹窗打断了这次按住，授权后再按一次才开始录
        holdRef.current = null;
        const requested = await requestRecordingPermissionsAsync();
        if (!requested.granted) showToast(t('messenger:record.micDenied'));
        return;
      }
      stopVoice();
      await settling.current;
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      if (holdRef.current !== hold) {
        await stopRecorder();
        setAudioModeAsync({ allowsRecording: false }).catch(() => {});
        showToast(t('messenger:record.hold'));
        return;
      }
      recorder.record();
      hold.startedAt = Date.now();
      setStartedAt(hold.startedAt);
      hold.timer = setTimeout(() => void finish('send'), MAX_DURATION);
      setLocked(lock);
      setPhase('recording');
      haptics.medium();
    } catch {
      holdRef.current = null;
      showToast(t('messenger:chat.operationFailed'));
    }
  }, [recorder, stopRecorder, finish, t]);

  const move = useCallback((x: number, y: number) => {
    const next = zoneAt(targetRects.current, x, y);
    if (next === zoneRef.current) return;
    zoneRef.current = next;
    setZone(next);
    // 滑到按钮上轻震一下；滑出不震
    if (next !== 'send') haptics.light();
  }, []);

  // 离开页面时放弃还在录的语音
  useEffect(() => () => {
    const hold = holdRef.current;
    holdRef.current = null;
    if (hold) clearTimeout(hold.timer);
    setAudioModeAsync({ allowsRecording: false }).catch(() => {});
  }, []);

  const pan = usePanGesture({
    runOnJS: true,
    enabled: phase !== 'converting' && !locked,
    minDistance: 0,
    shouldCancelWhenOutside: false,
    maxPointers: 1,
    onBegin: () => void press(false),
    onUpdate: (event) => move(event.absoluteX, event.absoluteY),
    onFinalize: (event) => {
      if (event.canceled) {
        void finish('cancel');
      } else if (zoneRef.current === 'lock' && holdRef.current?.startedAt) {
        // 松手锁定：继续录，之后在浮层里操作
        setLocked(true);
        zoneRef.current = 'send';
        setZone('send');
        haptics.light();
      } else {
        void finish(zoneRef.current === 'lock' ? 'send' : zoneRef.current);
      }
    },
  });

  let barLabel = t('messenger:record.hold');
  if (locked) barLabel = t('messenger:record.locked');
  else if (phase === 'recording') barLabel = t('messenger:record.releaseSend');
  const bar = (
    <GestureDetector gesture={pan}>
      <View accessibilityRole="button" accessibilityLabel={t('messenger:record.hold')} style={[styles.bar, phase !== 'idle' && styles.barActive]}>
        <Text style={styles.barText}>{barLabel}</Text>
      </View>
    </GestureDetector>
  );

  const hud = phase === 'idle' ? null : (
    <Animated.View entering={FadeIn.duration(120)} exiting={FadeOut.duration(100)}>
      <KeepFocus style={styles.card}>
        {phase === 'recording'
          ? <RecordingStatus recorder={recorder} startedAt={startedAt} zone={zone} locked={locked} onTargetLayout={onTargetLayout} onFinish={(action) => void finish(action)} />
          : (
            <>
              <ActivityIndicator size="small" color={theme.colors.primaryText} />
              <Text style={styles.converting}>{t('messenger:record.converting')}</Text>
            </>
          )}
      </KeepFocus>
    </Animated.View>
  );

  return {
    mode: voiceMode,
    setMode: setVoiceMode,
    bar,
    hud,
    start: () => {
      if (phase === 'idle') void press(true);
    },
  };
}

/**
 * 录音中：随音量跳动的圆点、时长、提示；按住时下方三个去向（位置对应滑动方向），锁定后换成取消、转文字、发送按钮。
 * 独立成组件，高频刷新不牵动输入栏
 */
function RecordingStatus({ recorder, startedAt, zone, locked, onTargetLayout, onFinish }: {
  recorder: AudioRecorder; startedAt: number; zone: Zone; locked: boolean;
  onTargetLayout: (zone: TargetZone, rect: Rect) => void; onFinish: (action: Finish) => void;
}) {
  const t = useT();
  const { metering } = useAudioRecorderState(recorder, TICK);
  const elapsed = useElapsed(startedAt);
  // 分贝映射到 0–1，-50dB 以下算安静
  const level = Math.min(1, Math.max(0, ((metering ?? -50) + 50) / 50));
  const left = MAX_DURATION - elapsed;
  // 点按录音一开始就是锁定的，不提松手
  let hint = t(!locked ? 'messenger:record.releaseSend' : HOLD_TO_TALK ? 'messenger:record.locked' : 'messenger:record.recording');
  let tone: 'muted' | 'danger' | 'primary' = 'muted';
  if (zone === 'cancel') {
    hint = t('messenger:record.releaseCancel');
    tone = 'danger';
  } else if (zone === 'convert') {
    hint = t('messenger:record.releaseConvert');
    tone = 'primary';
  } else if (zone === 'lock') {
    hint = t('messenger:record.releaseLock');
    tone = 'primary';
  } else if (left <= COUNTDOWN_FROM) {
    hint = t('messenger:record.autoSend', { count: Math.max(1, Math.ceil(left / 1000)) });
  } else if (!locked) {
    hint = t('messenger:record.slideLock');
  }
  return (
    <View style={styles.status}>
      <View style={styles.statusRow}>
        <View style={[styles.level, { transform: [{ scale: 1 + level * 0.8 }] }]} />
        <Text style={styles.time}>{formatElapsed(elapsed)}</Text>
        <Text style={styles.hint(tone)} numberOfLines={1}>{hint}</Text>
      </View>
      <View style={styles.targets}>
        {locked ? (
          <>
            <Target icon={X} label={t('messenger:chat.cancel')} tone="danger" active onPress={() => onFinish('cancel')} />
            <Target icon={Languages} label={t('messenger:record.convert')} tone="primary" active onPress={() => onFinish('convert')} />
            <Target icon={ArrowUp} label={t('messenger:chat.send')} tone="solid" active onPress={() => onFinish('send')} />
          </>
        ) : (
          <>
            <Target icon={X} label={t('messenger:chat.cancel')} tone="danger" active={zone === 'cancel'} onMeasure={(rect) => onTargetLayout('cancel', rect)} />
            <Target icon={Lock} label={t('messenger:record.lock')} tone="primary" active={zone === 'lock'} onMeasure={(rect) => onTargetLayout('lock', rect)} />
            <Target icon={Languages} label={t('messenger:record.convert')} tone="primary" active={zone === 'convert'} onMeasure={(rect) => onTargetLayout('convert', rect)} />
          </>
        )}
      </View>
    </View>
  );
}

/** 刷新间隔：与音量取样同步，按住时不占满 JS 线程（松手要及时响应） */
const TICK = 100;

/** 从 startedAt 起经过的毫秒，每 TICK 刷新 */
function useElapsed(startedAt: number): number {
  const [elapsed, setElapsed] = useState(() => Date.now() - startedAt);
  useEffect(() => {
    const timer = setInterval(() => setElapsed(Date.now() - startedAt), TICK);
    return () => clearInterval(timer);
  }, [startedAt]);
  return elapsed;
}

/** 分:秒.十分之一秒，如 0:03.4 */
function formatElapsed(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}.${Math.floor((ms % 1000) / 100)}`;
}

type TargetTone = 'danger' | 'primary' | 'solid';

/** 去向：按住时手指滑到哪个高亮哪个（onMeasure 报告它在窗口里的位置）；锁定后可点 */
function Target({ icon, label, tone, active, onPress, onMeasure }: {
  icon: LucideIcon; label: string; tone: TargetTone; active: boolean;
  onPress?: () => void; onMeasure?: (rect: Rect) => void;
}) {
  const { theme } = useUnistyles();
  const ref = useRef<ComponentRef<typeof View>>(null);
  const color = !active ? theme.colors.text2 : tone === 'primary' ? theme.colors.primaryText : theme.colors.onPrimary;
  return (
    <Touchable
      ref={ref}
      disabled={!onPress}
      onPress={onPress}
      onLayout={onMeasure && (() => ref.current && void measureInWindow(ref.current).then(onMeasure))}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.target(active ? tone : null), pressed && styles.pressed]}
    >
      <Icon icon={icon} color={color} size={theme.size.iconSmall} />
      <Text style={[styles.targetText, { color }]}>{label}</Text>
    </Touchable>
  );
}

const styles = StyleSheet.create((theme) => ({
  /** 与输入框同高同位 */
  bar: {
    height: theme.size.chatInput,
    borderRadius: theme.radius.block,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.fill,
    // Web 上按住拖动不选中文字
    userSelect: 'none',
  },
  barActive: { backgroundColor: theme.colors.fillPressed },
  barText: { ...theme.typography.callout, fontWeight: '600', color: theme.colors.text },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginHorizontal: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.surface,
    boxShadow: theme.shadow.popover,
  },
  converting: { ...theme.typography.callout, color: theme.colors.text },
  status: { flex: 1, gap: theme.spacing.md },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  level: { width: theme.size.dot, height: theme.size.dot, borderRadius: theme.radius.pill, backgroundColor: theme.colors.danger },
  time: { ...theme.typography.callout, color: theme.colors.text, fontVariant: ['tabular-nums'] },
  hint: (tone: 'muted' | 'danger' | 'primary') => ({
    ...theme.typography.subhead,
    flex: 1,
    textAlign: 'right',
    color: tone === 'danger' ? theme.colors.danger : tone === 'primary' ? theme.colors.primaryText : theme.colors.text3,
  }),
  targets: { flexDirection: 'row', gap: theme.spacing.sm },
  target: (tone: TargetTone | null) => ({
    flex: 1,
    height: theme.size.option,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    borderRadius: theme.radius.pill,
    backgroundColor: tone === 'danger' ? theme.colors.danger : tone === 'primary' ? theme.colors.primarySoft : tone === 'solid' ? theme.colors.primary : theme.colors.fill,
  }),
  targetText: { ...theme.typography.footnote },
  pressed: { opacity: theme.opacity.pressedIcon },
}));
