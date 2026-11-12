import type { LucideIcon } from 'lucide-react-native';
import { Check, ChevronDown, ChevronRight, Circle, CircleCheck, CircleDot, CircleStop, Folder, ShieldAlert } from 'lucide-react-native';
import { memo, useEffect, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
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
import type { AiActions, AiCtx, T } from './aiProcessModel';
import { ProcessGroup } from './AiProcess';
import type { BubbleTone } from './RichText';
import { RichBlocks } from './RichText';

/** 进行中轮换的状态提示 */
const TIPS = [
  'messenger:ai.tip1', 'messenger:ai.tip2', 'messenger:ai.tip3', 'messenger:ai.tip4', 'messenger:ai.tip5',
  'messenger:ai.tip6', 'messenger:ai.tip7', 'messenger:ai.tip8', 'messenger:ai.tip9', 'messenger:ai.tip10',
] as const;
const TIP_MS = 5000;

function useActions(msgId: number | undefined, t: T): AiActions | null {
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
  const ctx: AiCtx = { t, tone, mine: body.mine, actions, expectResize: expect, settleResize: settle };
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

function BlockView({ block, ctx }: { block: AiBlock; ctx: AiCtx }) {
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
function StatusLine({ status, showTips, ctx }: { status: AiBody['status']; showTips: boolean; ctx: AiCtx }) {
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

/** 需要确认的操作：工具行 + 确认面板；发起人确认或取消，其他人只能看到等待 */
function ConfirmBlock({ row, risk, confirm, ctx }: { row?: AiRow; risk: boolean; confirm: AiConfirm; ctx: AiCtx }) {
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
function PlanBlock({ block, ctx }: { block: Extract<AiBlock, { t: 'plan' }>; ctx: AiCtx }) {
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

function CardView({ card, ctx }: { card: AiCard; ctx: AiCtx }) {
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
function TaskRows({ rows, ctx }: { rows: AiTaskRow[]; ctx: AiCtx }) {
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
function BatchCard({ card, ctx }: { card: Extract<AiCard, { card: 'batch' }>; ctx: AiCtx }) {
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
  stop: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs,
    height: theme.size.ai.status, borderRadius: theme.radius.pill, paddingHorizontal: theme.spacing.sm,
  },
  group: { borderRadius: theme.radius.block, overflow: 'hidden', minWidth: theme.size.ai.minWidth },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, minHeight: theme.size.ai.groupHead, paddingHorizontal: theme.spacing.md },
  groupRows: { paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.sm, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm, paddingVertical: theme.size.ai.rowPadY },
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
