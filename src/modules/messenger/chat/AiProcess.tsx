import type { LucideIcon } from 'lucide-react-native';
import { Brain, ChevronDown, ChevronRight, Circle, CircleAlert, CircleCheck, CircleDashed, CircleDot, CircleX, Wrench } from 'lucide-react-native';
import { useLayoutEffect, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import type { AiRow } from '../../../sync/ai/timeline';
import { haptics } from '../../../platform/haptics';
import { Icon } from '../../../ui/Icon';
import { AT_END_SLOP, processTitle, rowTitle, useElapsed, type AiCtx, type ProcessBlock } from './aiProcessModel';
import type { BubbleTone } from './RichText';

/** 执行过程组（App，对照旧版 App AiBody）：进行中展开，结束后收起；可手动展开 / 收起；只有 1 项时标题用该项的名称 */
export function ProcessGroup({ block, ctx }: { block: ProcessBlock; ctx: AiCtx }) {
  const { t, tone, settleResize } = ctx;
  const { theme } = useUnistyles();
  const [manual, setManual] = useState<boolean | null>(null);
  const open = manual ?? block.live;
  useLayoutEffect(() => settleResize(), [settleResize, open]);
  const elapsed = useElapsed(block.live, block.startedAt);
  const title = processTitle(block, elapsed, t, block.items.length === 1 ? rowTitle(block.items[0]!, t) : t('messenger:ai.handled'));
  const failed = !block.live && block.failedCount > 0;
  return (
    <View style={[styles.group, { backgroundColor: tone.overlay }]}>
      <Pressable
        onPress={() => {
          haptics.selection();
          ctx.expectResize();
          setManual(!open);
        }}
        style={({ pressed }) => [styles.groupHead, pressed && styles.pressed]}
      >
        {block.live
          ? <ActivityIndicator size="small" color={tone.muted} style={styles.spinner} />
          : <Icon icon={failed ? CircleAlert : CircleCheck} color={failed ? theme.colors.warning : tone.muted} size={theme.size.ai.icon} />}
        <Text style={[styles.footnote, styles.flex, { color: tone.muted }]} numberOfLines={1}>{title}</Text>
        <Icon icon={open ? ChevronDown : ChevronRight} color={tone.muted} size={theme.size.ai.icon} />
      </Pressable>
      {open && <ProcessRows items={block.items} live={block.live} ctx={ctx} />}
    </View>
  );
}

/**
 * 执行过程的各行：超过最大高度时框内滚动。
 * 打开时停在最新一行；进行中新增行时，停在底部就跟着到底，往上翻着看时不打扰
 */
function ProcessRows({ items, live, ctx }: { items: AiRow[]; live: boolean; ctx: AiCtx }) {
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const atEnd = useRef(true);
  const shown = useRef(false);
  return (
    <ScrollView
      ref={scrollRef}
      style={styles.groupScroll}
      contentContainerStyle={styles.groupRows}
      nestedScrollEnabled
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

const ROW_ICONS: Record<AiRow['state'], LucideIcon> = {
  running: CircleDashed, done: CircleCheck, error: CircleX, confirming: CircleDot, skipped: Circle,
};

/** 一行思考或工具：标题 · 摘要，点开看全文 / 参数与结果 */
function ProcessRow({ row, ctx }: { row: AiRow; ctx: AiCtx }) {
  const { t, tone, settleResize } = ctx;
  const { theme } = useUnistyles();
  const [open, setOpen] = useState(false);
  useLayoutEffect(() => settleResize(), [settleResize, open]);
  const expandable = !!(row.detail || row.result);
  let icon = row.kind === 'reasoning' ? Brain : ROW_ICONS[row.state];
  if (row.kind === 'tool' && row.state === 'done') icon = Wrench;
  const color = row.state === 'error' ? tone.danger : tone.muted;
  return (
    <View>
      <Pressable
        disabled={!expandable}
        onPress={() => {
          ctx.expectResize();
          setOpen(!open);
        }}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        {row.state === 'running' && row.kind === 'tool'
          ? <ActivityIndicator size="small" color={tone.muted} style={styles.spinner} />
          : <Icon icon={icon} color={color} size={theme.size.ai.icon - 2} />}
        <Text style={[styles.footnote, styles.flex, { color: tone.text }]} numberOfLines={open ? undefined : 1}>
          {rowTitle(row, t)}
          {!!row.summary && !open && <Text style={{ color: tone.muted }}> · {row.summary}</Text>}
        </Text>
      </Pressable>
      {open && (
        <View style={styles.rowDetail}>
          {row.kind === 'reasoning' ? (
            <Text style={[styles.footnote, { color: tone.muted }]}>{row.detail}</Text>
          ) : (
            <>
              {!!row.detail && <CodeBox label={t('messenger:ai.args')} text={row.detail} tone={tone} />}
              {!!row.result && <CodeBox label={t('messenger:ai.result')} text={row.result} tone={tone} />}
            </>
          )}
        </View>
      )}
    </View>
  );
}

function CodeBox({ label, text, tone }: { label: string; text: string; tone: BubbleTone }) {
  return (
    <View style={styles.codeWrap}>
      <Text style={[styles.caption2, { color: tone.muted }]}>{label}</Text>
      <ScrollView horizontal style={[styles.code, { backgroundColor: tone.overlay }]} contentContainerStyle={styles.codeContent}>
        <Text style={[styles.codeText, { color: tone.text }]} selectable>{text}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  flex: { flex: 1, flexShrink: 1 },
  pressed: { opacity: theme.opacity.pressedIcon },
  footnote: { ...theme.typography.footnote },
  caption2: { ...theme.typography.caption2 },
  codeText: { ...theme.typography.aiCode },
  /** small 在 Android 上是 20，缩成与图标一样大 */
  spinner: { width: theme.size.ai.icon, height: theme.size.ai.icon, transform: [{ scale: 0.8 }] },
  group: { borderRadius: theme.radius.block, overflow: 'hidden', minWidth: theme.size.ai.minWidth },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, minHeight: theme.size.ai.groupHead, paddingHorizontal: theme.spacing.md },
  groupScroll: { maxHeight: theme.size.ai.scrollMax },
  groupRows: { paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.sm, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm, paddingVertical: theme.size.ai.rowPadY },
  rowDetail: { paddingLeft: theme.size.ai.rowIndent, paddingBottom: theme.spacing.xs, gap: theme.spacing.xs },
  codeWrap: { gap: 2 },
  code: { borderRadius: theme.radius.bubbleTight, maxHeight: theme.size.ai.scrollMax },
  codeContent: { padding: theme.spacing.sm },
}));
