import type { LucideIcon } from 'lucide-react-native';
import {
  Brain, Check, ChevronDown, ChevronRight, Circle, CircleAlert, CircleCheck, CircleDashed, CircleDot, CircleStop, CircleX, Folder, ShieldAlert, Wrench,
} from 'lucide-react-native';
import { memo, useEffect, useLayoutEffect, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import type { AiBlock, AiBody, AiCard, AiConfirm, AiRow, AiTaskRow } from '../../../sync/ai/timeline';
import { assistantApi } from '../../../sync/api';
import { haptics } from '../../../platform/haptics';
import { useKeepTop } from '../../../ui/chat';
import { Icon } from '../../../ui/Icon';
import { showLayerConfirm } from '../../../ui/LayerConfirm';
import { ShimmerText } from '../../../ui/ShimmerText';
import { showToast } from '../../../ui/Toast';
import { api, useErrorText } from '../../session';
import { useMessengerInstance } from '../service';
import type { BubbleTone } from './RichText';
import { RichBlocks } from './RichText';

/** 进行中轮换的状态提示 */
const TIPS = [
  'messenger:ai.tip1', 'messenger:ai.tip2', 'messenger:ai.tip3', 'messenger:ai.tip4', 'messenger:ai.tip5',
  'messenger:ai.tip6', 'messenger:ai.tip7', 'messenger:ai.tip8', 'messenger:ai.tip9', 'messenger:ai.tip10',
] as const;
const TIP_MS = 5000;
/** 停在底部的判定余量 */
const AT_END_SLOP = 8;

type T = ReturnType<typeof useT>;

/** 发起人的操作：停止、确认、卡片动作；失败弹提示 */
interface Actions {
  stop: () => void;
  resume: (confirmId: string, approved: boolean) => Promise<void>;
  dismissCard: (cardId: string) => Promise<void>;
}

interface Ctx {
  t: T;
  tone: BubbleTone;
  mine: boolean;
  /** 没有消息 ID（如预览）时为空，只能看 */
  actions: Actions | null;
  /** 展开 / 收起前调用 expectResize，展开状态变化的那次提交里调用 settleResize：高度变化保持顶部不动 */
  expectResize: () => void;
  settleResize: () => void;
}

function useActions(msgId: number | undefined, t: T): Actions | null {
  const errorText = useErrorText();
  const runs = useMessengerInstance((s) => s.runs);
  if (!msgId) return null;
  const run = (task: Promise<unknown>) => task.then(() => undefined, (err: unknown) => showToast(errorText(err)));
  return {
    stop: () => showLayerConfirm({
      title: t('messenger:ai.stopConfirm'),
      okLabel: t('messenger:ai.stop'),
      cancelLabel: t('messenger:ai.cancel'),
      onOk: () => void run(assistantApi.cancel(api, msgId)),
    }),
    resume: (confirmId, approved) => run(assistantApi.resume(api, msgId, confirmId, approved).then(() => runs?.resume(msgId))),
    dismissCard: (cardId) => run(assistantApi.cardAction(api, msgId, cardId, 'dismiss')),
  };
}

/**
 * AI 回复（对照旧版 App features/dialog/ai/AiBody）：执行过程、确认、计划、卡片、正文按发生顺序排列，进行中时末尾是状态行
 */
export const AiBodyView = memo(function AiBodyView({ body, tone, msgId }: { body: AiBody; tone: BubbleTone; msgId?: number }) {
  const t = useT();
  const { ref, expect, settle } = useKeepTop();
  const actions = useActions(msgId, t);
  const ctx: Ctx = { t, tone, mine: body.mine, actions, expectResize: expect, settleResize: settle };
  const active = body.status === 'running' || body.status === 'waiting_confirm';
  return (
    <View ref={ref} style={styles.body}>
      {body.blocks.map((block) => <BlockView key={block.key} block={block} ctx={ctx} />)}
      {active && <StatusLine status={body.status} showTips={body.blocks.length > 0} ctx={ctx} />}
      {body.status === 'error' && !!body.error && <Text style={[styles.footnote, { color: tone.danger }]}>{body.error}</Text>}
      {body.status === 'cancelled' && <Text style={[styles.footnote, { color: tone.muted }]}>{t('messenger:ai.stopped')}</Text>}
    </View>
  );
});

function BlockView({ block, ctx }: { block: AiBlock; ctx: Ctx }) {
  switch (block.t) {
    case 'process':
      return <ProcessGroup block={block} ctx={ctx} />;
    case 'confirm':
      return <ConfirmBlock row={block.row} risk={block.risk} confirm={block.confirm} ctx={ctx} />;
    case 'plan':
      return <PlanBlock block={block} ctx={ctx} />;
    case 'text':
      return <RichBlocks blocks={block.blocks} tone={ctx.tone} />;
    case 'card':
      return <CardView card={block} ctx={ctx} />;
  }
}

/** 进行中的状态行：等待确认 / 轮换提示；发起人可停止 */
function StatusLine({ status, showTips, ctx }: { status: AiBody['status']; showTips: boolean; ctx: Ctx }) {
  const { t, tone, mine, actions } = ctx;
  const { theme } = useUnistyles();
  const [tip, setTip] = useState(0);
  useEffect(() => {
    if (status === 'waiting_confirm') return undefined;
    const timer = setInterval(() => setTip((value) => (value + 1) % TIPS.length), TIP_MS);
    return () => clearInterval(timer);
  }, [status]);
  let text = t(TIPS[tip]!);
  if (status === 'waiting_confirm') text = t('messenger:ai.waitingConfirm');
  else if (!showTips) text = t('messenger:ai.processing');
  return (
    <View style={styles.status}>
      {/* 同旧版：不用转圈（与工具行的转圈区分），文字流光表示仍在工作 */}
      <Animated.View key={text} entering={FadeIn.duration(200)} style={styles.flex}>
        <ShimmerText text={text} style={[styles.footnote, { color: tone.text }]} />
      </Animated.View>
      {mine && actions && (
        <Pressable onPress={actions.stop} hitSlop={theme.spacing.sm} style={({ pressed }) => [styles.stop, { backgroundColor: tone.overlay }, pressed && styles.pressed]}>
          <Icon icon={CircleStop} color={tone.text} size={theme.size.ai.icon - 2} />
          <Text style={[styles.caption, { color: tone.text }]}>{t('messenger:ai.stop')}</Text>
        </Pressable>
      )}
    </View>
  );
}

/** 进行中每秒走一次的耗时；没有开始时间时从第一次看到算起 */
function useElapsed(live: boolean, startedAt: number): number {
  const [seen] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!live) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [live]);
  return now - (startedAt || seen);
}

function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function rowTitle(row: AiRow, t: T): string {
  if (row.kind === 'reasoning') return t(row.state === 'running' ? 'messenger:ai.thinking' : 'messenger:ai.thought');
  return row.name;
}

/** 执行过程组：进行中展开，结束后收起；可手动展开 / 收起 */
function ProcessGroup({ block, ctx }: { block: Extract<AiBlock, { t: 'process' }>; ctx: Ctx }) {
  const { t, tone, settleResize } = ctx;
  const { theme } = useUnistyles();
  const [manual, setManual] = useState<boolean | null>(null);
  const open = manual ?? block.live;
  useLayoutEffect(() => settleResize(), [settleResize, open]);
  const elapsed = useElapsed(block.live, block.startedAt);
  let title: string;
  if (block.live) title = elapsed < 1000 ? t('messenger:ai.executing') : `${t('messenger:ai.executing')} · ${formatElapsed(elapsed)}`;
  else if (block.toolCount > 0 && (block.items.length > 1 || block.failedCount > 0)) {
    title = block.failedCount > 0
      ? t('messenger:ai.toolFailed', { n: block.toolCount, failed: block.failedCount })
      : t('messenger:ai.toolCount', { n: block.toolCount });
  } else if (block.items.length === 1) title = rowTitle(block.items[0]!, t);
  else title = t('messenger:ai.handled');
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
function ProcessRows({ items, live, ctx }: { items: AiRow[]; live: boolean; ctx: Ctx }) {
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
function ProcessRow({ row, ctx }: { row: AiRow; ctx: Ctx }) {
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

/** 需要确认的操作：工具行 + 确认面板；发起人确认或取消，其他人只能看到等待 */
function ConfirmBlock({ row, risk, confirm, ctx }: { row?: AiRow; risk: boolean; confirm: AiConfirm; ctx: Ctx }) {
  const { t, tone, mine, actions } = ctx;
  const { theme } = useUnistyles();
  const [submitting, setSubmitting] = useState<'approve' | 'reject' | null>(null);
  const pending = confirm.status === 'pending';
  const tag = {
    pending: t('messenger:ai.needConfirm'),
    approved: t('messenger:ai.approved'),
    rejected: t('messenger:ai.rejected'),
    expired: t('messenger:ai.expired'),
  }[confirm.status];
  const submit = (approved: boolean) => {
    if (!actions || submitting) return;
    haptics.light();
    setSubmitting(approved ? 'approve' : 'reject');
    void actions.resume(confirm.id, approved).finally(() => setSubmitting(null));
  };
  const border = pending ? (risk ? theme.colors.danger : theme.colors.warning) : tone.separator;
  return (
    <View style={[styles.confirm, { borderColor: border }]}>
      <View style={styles.confirmHead}>
        <Icon icon={risk ? ShieldAlert : CircleDot} color={pending ? border : tone.muted} size={theme.size.ai.icon} />
        <Text style={[styles.footnote, styles.flex, styles.bold, { color: tone.text }]} numberOfLines={2}>{row ? row.name : tag}</Text>
        {risk && (
          <View style={styles.badge}>
            <Text style={[styles.caption2, styles.onColor]}>{t('messenger:ai.danger')}</Text>
          </View>
        )}
      </View>
      {!!row?.summary && <Text style={[styles.codeText, { color: tone.muted }]} numberOfLines={3}>{row.summary}</Text>}
      {!!confirm.summary && <Text style={[styles.subhead, { color: tone.text }]}>{confirm.summary}</Text>}
      {confirm.targets.length > 0 && (
        <View style={styles.targets}>
          {confirm.targets.map((target, index) => (
            <Text key={index} style={[styles.footnote, { color: tone.muted }]} numberOfLines={1}>• {target}</Text>
          ))}
        </View>
      )}
      {pending && mine && actions ? (
        <View style={styles.buttons}>
          <Pressable
            disabled={!!submitting}
            onPress={() => submit(false)}
            style={({ pressed }) => [styles.button, { backgroundColor: tone.overlay }, pressed && styles.pressed]}
          >
            {submitting === 'reject'
              ? <ActivityIndicator size="small" color={tone.text} />
              : <Text style={[styles.subhead, { color: tone.text }]}>{t('messenger:ai.cancel')}</Text>}
          </Pressable>
          <Pressable
            disabled={!!submitting}
            onPress={() => submit(true)}
            style={({ pressed }) => [styles.button, styles.primary(risk), pressed && styles.pressedPrimary]}
          >
            {submitting === 'approve'
              ? <ActivityIndicator size="small" color={theme.colors.onPrimary} />
              : <Text style={[styles.subhead, styles.bold, styles.onColor]}>{t('messenger:ai.approve')}</Text>}
          </Pressable>
        </View>
      ) : (
        <Text style={[styles.caption, { color: tone.muted }]}>{pending ? t('messenger:ai.waitInitiator') : tag}</Text>
      )}
    </View>
  );
}

const PLAN_ICONS: Record<string, LucideIcon> = { completed: CircleCheck, in_progress: CircleDot };

/** 执行计划：完成前展开，完成后收起 */
function PlanBlock({ block, ctx }: { block: Extract<AiBlock, { t: 'plan' }>; ctx: Ctx }) {
  const { t, tone, settleResize } = ctx;
  const { theme } = useUnistyles();
  const [manual, setManual] = useState<boolean | null>(null);
  const open = manual ?? !block.finished;
  useLayoutEffect(() => settleResize(), [settleResize, open]);
  return (
    <View style={[styles.group, { backgroundColor: tone.overlay }]}>
      <Pressable
        onPress={() => {
          ctx.expectResize();
          setManual(!open);
        }}
        style={({ pressed }) => [styles.groupHead, pressed && styles.pressed]}
      >
        <Text style={[styles.footnote, styles.flex, styles.bold, { color: tone.text }]}>
          {t('messenger:ai.plan')} <Text style={[styles.tabular, { color: tone.muted }]}>{block.completed}/{block.items.length}</Text>
        </Text>
        <Icon icon={open ? ChevronDown : ChevronRight} color={tone.muted} size={theme.size.ai.icon} />
      </Pressable>
      {open && (
        <View style={styles.groupRows}>
          {block.items.map((item, index) => {
            const done = item.status === 'completed';
            const doing = item.status === 'in_progress';
            return (
              <View key={index} style={styles.row}>
                <Icon
                  icon={PLAN_ICONS[item.status] ?? Circle}
                  color={done ? theme.colors.primaryText : doing ? tone.accent : tone.muted}
                  size={theme.size.ai.icon - 2}
                />
                <Text style={[styles.footnote, styles.flex, { color: done ? tone.muted : tone.text }, done && styles.strike, doing && styles.bold]}>
                  {item.text}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function CardView({ card, ctx }: { card: AiCard; ctx: Ctx }) {
  const { tone } = ctx;
  if (card.card === 'fallback') return <RichBlocks blocks={card.blocks} tone={tone} />;
  return (
    <View style={[styles.card, { borderColor: tone.separator }]}>
      {!!card.title && <Text style={[styles.subhead, styles.bold, styles.cardTitle, { color: tone.text }]}>{card.title}</Text>}
      {card.card === 'tasks' ? <TaskRows rows={card.rows} ctx={ctx} /> : <BatchCard card={card} ctx={ctx} />}
    </View>
  );
}

/** 任务列表卡片：状态圈、名称、备注（打开任务、切换状态等任务模块做好后接上） */
function TaskRows({ rows, ctx }: { rows: AiTaskRow[]; ctx: Ctx }) {
  const { tone } = ctx;
  const { theme } = useUnistyles();
  return (
    <View>
      {rows.map((row, index) => (
        <View key={row.id || `p${index}`} style={[styles.taskRow, index > 0 && [styles.taskRowLine, { borderTopColor: tone.separator }]]}>
          <Icon icon={Circle} color={tone.muted} size={theme.size.iconSmall} />
          <View style={styles.flex}>
            <Text style={[styles.subhead, { color: row.id ? tone.text : tone.muted }]} numberOfLines={2}>{row.name}</Text>
            {!!row.note && <Text style={[styles.caption, { color: tone.muted }]} numberOfLines={1}>{row.note}</Text>}
          </View>
        </View>
      ))}
    </View>
  );
}

/** 批量建任务预览：发起人可取消（批量创建等任务模块做好后接上）；已创建的列出结果 */
function BatchCard({ card, ctx }: { card: Extract<AiCard, { card: 'batch' }>; ctx: Ctx }) {
  const { t, tone, mine, actions } = ctx;
  const { theme } = useUnistyles();
  const [submitting, setSubmitting] = useState(false);
  const meta = [card.project, card.column].filter(Boolean).join(' / ');
  const header = !!meta && (
    <View style={styles.batchMeta}>
      <Icon icon={Folder} color={tone.muted} size={theme.size.ai.icon - 2} />
      <Text style={[styles.caption, styles.flex, { color: tone.muted }]} numberOfLines={1}>{t('messenger:ai.project')}：{meta}</Text>
    </View>
  );

  if (card.status === 'created') {
    return (
      <View>
        {header}
        {card.created.map((item) => (
          <View key={item.taskId} style={styles.batchRow}>
            <Icon icon={Check} color={theme.colors.primaryText} size={theme.size.ai.icon} />
            <Text style={[styles.subhead, styles.flex, { color: tone.text }]} numberOfLines={2}>{item.name}</Text>
          </View>
        ))}
        <Text style={[styles.caption, styles.batchFoot, { color: tone.muted }]}>{t('messenger:ai.created', { n: card.created.length })}</Text>
      </View>
    );
  }

  const canAct = mine && !card.status && !!actions && !!card.id;
  const dismiss = () => {
    if (!actions || submitting) return;
    setSubmitting(true);
    void actions.dismissCard(card.id).finally(() => setSubmitting(false));
  };
  return (
    <View>
      {header}
      {card.items.map((item, index) => (
        <View key={index} style={styles.batchRow}>
          <Text style={[styles.subhead, styles.flex, { color: card.status === 'dismissed' ? tone.muted : tone.text }]} numberOfLines={2}>{item.name}</Text>
          {!!item.end && <Text style={[styles.caption, styles.tabular, { color: tone.muted }]}>{item.end}</Text>}
        </View>
      ))}
      {card.status === 'dismissed' && <Text style={[styles.caption, styles.batchFoot, { color: tone.muted }]}>{t('messenger:ai.rejected')}</Text>}
      {!card.status && !canAct && <Text style={[styles.caption, styles.batchFoot, { color: tone.muted }]}>{t('messenger:ai.waitInitiator')}</Text>}
      {canAct && (
        <View style={styles.buttons}>
          <Pressable disabled={submitting} onPress={dismiss} style={({ pressed }) => [styles.button, { backgroundColor: tone.overlay }, pressed && styles.pressed]}>
            {submitting
              ? <ActivityIndicator size="small" color={tone.text} />
              : <Text style={[styles.subhead, { color: tone.text }]}>{t('messenger:ai.cancel')}</Text>}
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  body: { gap: theme.spacing.sm },
  flex: { flex: 1, flexShrink: 1 },
  bold: { fontWeight: '600' },
  strike: { textDecorationLine: 'line-through' },
  tabular: { fontVariant: ['tabular-nums'] },
  pressed: { opacity: theme.opacity.pressedIcon },
  pressedPrimary: { opacity: theme.opacity.pressedPrimary },
  onColor: { color: theme.colors.onPrimary },
  subhead: { ...theme.typography.subhead },
  footnote: { ...theme.typography.footnote },
  caption: { ...theme.typography.caption },
  caption2: { ...theme.typography.caption2 },
  codeText: { ...theme.typography.aiCode },
  status: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, minHeight: theme.size.ai.status, minWidth: theme.size.ai.minWidth },
  /** small 在 Android 上是 20，缩成与图标一样大 */
  spinner: { width: theme.size.ai.icon, height: theme.size.ai.icon, transform: [{ scale: 0.8 }] },
  stop: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs,
    height: theme.size.ai.status, borderRadius: theme.radius.pill, paddingHorizontal: theme.spacing.sm,
  },
  group: { borderRadius: theme.radius.block, overflow: 'hidden', minWidth: theme.size.ai.minWidth },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, minHeight: theme.size.ai.groupHead, paddingHorizontal: theme.spacing.md },
  groupScroll: { maxHeight: theme.size.ai.scrollMax },
  groupRows: { paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.sm, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm, paddingVertical: theme.size.ai.rowPadY },
  rowDetail: { paddingLeft: theme.size.ai.rowIndent, paddingBottom: theme.spacing.xs, gap: theme.spacing.xs },
  codeWrap: { gap: 2 },
  code: { borderRadius: theme.radius.bubbleTight, maxHeight: theme.size.ai.scrollMax },
  codeContent: { padding: theme.spacing.sm },
  confirm: { borderWidth: 1, borderRadius: theme.radius.block, padding: theme.spacing.md, gap: theme.spacing.sm, minWidth: theme.size.ai.minWidth },
  confirmHead: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  badge: {
    borderRadius: theme.radius.pill, paddingHorizontal: theme.size.ai.badgePadX, paddingVertical: theme.size.ai.badgePadY, backgroundColor: theme.colors.danger,
  },
  targets: { gap: 2 },
  buttons: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.xs },
  button: { flex: 1, height: theme.size.ai.button, borderRadius: theme.radius.block, alignItems: 'center', justifyContent: 'center' },
  primary: (risk: boolean) => ({ backgroundColor: risk ? theme.colors.danger : theme.colors.primary }),
  // 上下多留一点外边距，和前后的正文分开
  card: {
    borderWidth: StyleSheet.hairlineWidth, borderRadius: theme.radius.block, padding: theme.spacing.md,
    marginVertical: theme.spacing.xs, minWidth: theme.size.ai.minWidth,
  },
  cardTitle: { marginBottom: theme.spacing.sm },
  taskRow: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm, paddingVertical: theme.spacing.sm },
  taskRowLine: { borderTopWidth: StyleSheet.hairlineWidth },
  batchMeta: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, marginBottom: theme.spacing.xs },
  batchRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, minHeight: theme.size.ai.button },
  batchFoot: { marginTop: theme.spacing.sm },
}));
