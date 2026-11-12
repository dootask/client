import { ChevronDown, LoaderCircle } from 'lucide-react-native';
import { useEffect, useLayoutEffect, useRef, useState, type ComponentRef } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import type { AiRow } from '../../../sync/ai/timeline';
import { Icon } from '../../../ui/Icon';
import { AT_END_SLOP, processTitle, rowTitle, useElapsed, type AiCtx, type ProcessBlock } from './aiProcessModel';

/** 转一圈的时长 */
const SPIN_MS = 1000;
/** 实心状态图标里白色符号的路径（lucide CircleCheck / CircleX / CircleMinus 的内部） */
const GLYPHS = { check: ['m9 12 2 2 4-4'], cross: ['m15 9-6 6', 'm9 9 6 6'], minus: ['M8 12h8'] } as const;

/**
 * 执行过程组（网页，同旧版网页 AIAssistant/message-parts）：左侧方框里的箭头 + 标题，没有底色；
 * 进行中展开、结束后收起，可手动切换；展开后左侧一条竖线，各行在框内滚动
 */
export function ProcessGroup({ block, ctx }: { block: ProcessBlock; ctx: AiCtx }) {
  const { t, settleResize } = ctx;
  const { theme } = useUnistyles();
  const [manual, setManual] = useState<boolean | null>(null);
  const open = manual ?? block.live;
  useLayoutEffect(() => settleResize(), [settleResize, open]);
  const elapsed = useElapsed(block.live, block.startedAt);
  return (
    <View>
      <Pressable
        onPress={() => {
          ctx.expectResize();
          setManual(!open);
        }}
        style={styles.head}
      >
        <View style={styles.toggle}>
          <View style={styles.arrow(open)}>
            <Icon icon={ChevronDown} color={theme.colors.aiProcess.toggleIcon} size={theme.size.aiProcess.arrow} />
          </View>
        </View>
        <Text style={styles.title} numberOfLines={1}>{processTitle(block, elapsed, t, t('messenger:ai.handled'))}</Text>
      </Pressable>
      {open && <ProcessRows items={block.items} live={block.live} ctx={ctx} />}
    </View>
  );
}

/** 各行：超过最大高度时框内滚动；打开时停在最新一行，进行中停在底部就跟着到底 */
function ProcessRows({ items, live, ctx }: { items: AiRow[]; live: boolean; ctx: AiCtx }) {
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const atEnd = useRef(true);
  const shown = useRef(false);
  return (
    <ScrollView
      ref={scrollRef}
      style={styles.body}
      contentContainerStyle={styles.list}
      scrollEventThrottle={32}
      onScroll={({ nativeEvent: { contentOffset, contentSize, layoutMeasurement } }) => {
        atEnd.current = contentOffset.y + layoutMeasurement.height >= contentSize.height - AT_END_SLOP;
      }}
      onContentSizeChange={() => {
        if (!shown.current || (live && atEnd.current)) scrollRef.current?.scrollToEnd({ animated: false });
        shown.current = true;
      }}
    >
      {items.map((row) => <ProcessRow key={row.key} row={row} ctx={ctx} />)}
    </ScrollView>
  );
}

/** 一行：状态图标、名称、「· 摘要」（单行省略）；点开看思考全文或参数、结果 */
function ProcessRow({ row, ctx }: { row: AiRow; ctx: AiCtx }) {
  const { t, settleResize } = ctx;
  const [open, setOpen] = useState(false);
  useLayoutEffect(() => settleResize(), [settleResize, open]);
  return (
    <View>
      <Pressable
        onPress={() => {
          ctx.expectResize();
          setOpen(!open);
        }}
        style={styles.row}
      >
        <RowIcon state={row.state} />
        <Text style={styles.name} numberOfLines={1}>{rowTitle(row, t)}</Text>
        {!!row.summary && <Text style={styles.desc} numberOfLines={1}>· {row.summary}</Text>}
      </Pressable>
      {open && (
        <View style={styles.detail}>
          {row.kind === 'reasoning' ? (
            !!row.detail && <CodeBox text={row.detail} prose />
          ) : (
            <>
              {!!row.detail && <CodeBox text={row.detail} />}
              {!!row.result && <CodeBox text={row.result} />}
            </>
          )}
        </View>
      )}
    </View>
  );
}

/** 详情框：参数、结果用等宽字；思考全文（prose）用正文字体、按词换行 */
function CodeBox({ text, prose = false }: { text: string; prose?: boolean }) {
  return (
    <ScrollView style={styles.codeBox} contentContainerStyle={styles.codeContent}>
      <Text style={prose ? styles.prose : styles.code} selectable>{text}</Text>
    </ScrollView>
  );
}

/** 状态图标：进行中转圈；其余是实心圆加白色符号（完成勾、失败叉、跳过横线，待确认同完成形状） */
function RowIcon({ state }: { state: AiRow['state'] }) {
  const { theme } = useUnistyles();
  const colors = theme.colors.aiProcess;
  const size = theme.size.aiProcess.icon;
  if (state === 'running') return <Spinner color={colors.text} size={size} />;
  const color = { done: colors.done, confirming: colors.confirming, error: colors.error, skipped: colors.skipped }[state];
  const glyph = state === 'error' ? GLYPHS.cross : state === 'skipped' ? GLYPHS.minus : GLYPHS.check;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={10} stroke={color} fill={color} />
      {glyph.map((d) => <Path key={d} d={d} stroke={theme.colors.onPrimary} />)}
    </Svg>
  );
}

function Spinner({ color, size }: { color: string; size: number }) {
  const turn = useSharedValue(0);
  useEffect(() => {
    turn.set(withRepeat(withTiming(1, { duration: SPIN_MS, easing: Easing.linear }), -1));
    return () => cancelAnimation(turn);
  }, [turn]);
  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.get() * 360}deg` }] }));
  return (
    <Animated.View style={spin}>
      <Icon icon={LoaderCircle} color={color} size={size} />
    </Animated.View>
  );
}

const styles = StyleSheet.create((theme) => ({
  head: { flexDirection: 'row', alignItems: 'center', gap: theme.size.aiProcess.headGap, minHeight: theme.size.aiProcess.head, cursor: 'pointer', userSelect: 'none' },
  toggle: {
    width: theme.size.aiProcess.toggle, height: theme.size.aiProcess.toggle, borderRadius: theme.size.aiProcess.toggleRadius,
    borderWidth: 1, borderColor: theme.colors.aiProcess.toggleLine, alignItems: 'center', justifyContent: 'center',
  },
  /** 收起时箭头朝右，展开时朝下 */
  arrow: (open: boolean) => ({ transform: [{ rotate: open ? '0deg' : '-90deg' }], transitionProperty: 'transform', transitionDuration: '200ms' }),
  title: { ...theme.typography.aiProcessTitle, flexShrink: 1, color: theme.colors.aiProcess.title },
  body: {
    maxHeight: theme.size.aiProcess.bodyMax, marginTop: theme.size.aiProcess.bodyTop, marginLeft: theme.size.aiProcess.bodyLeft,
    paddingLeft: theme.size.aiProcess.bodyPadLeft, borderLeftWidth: 1, borderLeftColor: theme.colors.aiProcess.line,
  },
  list: { gap: theme.size.aiProcess.listGap },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.size.aiProcess.rowGap, minHeight: theme.size.aiProcess.row, cursor: 'pointer', userSelect: 'none' },
  name: { ...theme.typography.aiProcessRow, flexShrink: 0, maxWidth: '60%', color: theme.colors.aiProcess.name },
  desc: { ...theme.typography.aiProcessRow, flex: 1, minWidth: 0, color: theme.colors.aiProcess.desc },
  detail: { marginTop: theme.size.aiProcess.detailTop, marginBottom: theme.size.aiProcess.detailBottom, marginLeft: theme.size.aiProcess.detailLeft },
  codeBox: { maxHeight: theme.size.aiProcess.codeMax, marginBottom: theme.size.aiProcess.codeGap, borderRadius: theme.size.aiProcess.codeRadius, backgroundColor: theme.colors.aiProcess.codeFill },
  codeContent: { paddingVertical: theme.size.aiProcess.codePadY, paddingHorizontal: theme.size.aiProcess.codePadX },
  code: { ...theme.typography.aiProcessCode, color: theme.colors.aiProcess.text, whiteSpace: 'pre-wrap', wordBreak: 'break-all' },
  prose: { ...theme.typography.aiProcessDetail, color: theme.colors.aiProcess.text, whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
}));
