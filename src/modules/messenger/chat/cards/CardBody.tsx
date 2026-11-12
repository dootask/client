import { CheckCircle2, Circle, MapPin, Square, SquareCheck, Video, Vote, type LucideIcon } from 'lucide-react-native';
import { useLayoutEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../../i18n';
import type { MsgBody, VoteBody } from '../../../../sync/messenger/body';
import { UserAvatar } from '../../../../ui/Avatar';
import { useKeepTop } from '../../../../ui/chat';
import { Icon } from '../../../../ui/Icon';
import { Confirm } from '../../../../ui/popover';
import { Touchable } from '../../../../ui/Touchable';
import { useUser } from '../../hooks';
import { PreviewText } from '../../PreviewText';
import { RichBlocks, type BubbleTone } from '../RichText';
import { TemplateCard } from './TemplateCard';
import { CHAIN_FOLD, CHAIN_FOLD_SHOW, type CardMsgBody, channelId, mergeTitleText } from './cardModel';
import { useCardOpen } from './cardMsg';
import { useVoteAction } from './useVoteAction';

type Body<K extends MsgBody['kind']> = Extract<MsgBody, { kind: K }>;

/** 旧版 App 的卡片消息：投票、接龙、位置、会议、合并转发、模板消息 */
export function CardBody({ body, tone }: { body: CardMsgBody; tone: BubbleTone }) {
  const { theme } = useUnistyles();
  switch (body.kind) {
    case 'vote':
      return <VoteCard body={body} tone={tone} />;
    case 'wordChain':
      return <ChainCard body={body} tone={tone} />;
    case 'location':
      return <IconCard icon={MapPin} color={theme.palette.tile.location} title={body.title} subtitle={body.address} tone={tone} />;
    case 'meeting':
      return <MeetingCard body={body} tone={tone} />;
    case 'mergeForward':
      return <MergeCard body={body} tone={tone} />;
    case 'template':
      return <TemplateCard data={body.template} tone={tone} />;
  }
}

/** 投票：没投过且进行中时可选可投；投过或已结束看结果；发起人在进行中可再次发送、结束。只看不操作的地方（合并转发详情）不显示按钮 */
function VoteCard({ body, tone }: { body: VoteBody; tone: BubbleTone }) {
  const t = useT();
  const { theme } = useUnistyles();
  const { busy, run } = useVoteAction();
  const [picked, setPicked] = useState<string[]>([]);
  const voting = body.mine.length === 0 && body.active;
  const toggle = (id: string) => {
    setPicked((list) => {
      if (!body.multiple) return [id];
      return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
    });
  };
  return (
    <View testID="card-vote" style={[styles.card, styles.wide]}>
      <CardLabel icon={Vote} tone={tone} text={[
        t('messenger:label.vote'),
        t(body.multiple ? 'messenger:card.multiple' : 'messenger:card.single'),
        t(body.anonymous ? 'messenger:card.anonymous' : 'messenger:card.named'),
      ].join(' · ')} />
      <RichBlocks blocks={body.blocks} tone={tone} />
      {voting ? (
        <View style={styles.options}>
          {body.options.map((option) => {
            const on = picked.includes(option.id);
            const icon = body.multiple ? (on ? SquareCheck : Square) : (on ? CheckCircle2 : Circle);
            return (
              <Touchable
                key={option.id}
                accessibilityRole={body.multiple ? 'checkbox' : 'radio'}
                accessibilityState={{ checked: on }}
                disabled={!run}
                onPress={() => toggle(option.id)}
                style={[styles.option, { backgroundColor: tone.overlay }]}
              >
                <Icon icon={icon} color={on ? tone.accent : tone.muted} size={theme.size.card.appOptionIcon} />
                <Text style={[styles.subhead, styles.shrink, { color: tone.text }]}>{option.text}</Text>
              </Touchable>
            );
          })}
          {run && (
            <ActionButton
              label={t(picked.length ? 'messenger:card.voteNow' : 'messenger:card.pickFirst')}
              tone={tone}
              filled={picked.length > 0}
              busy={busy}
              disabled={!picked.length}
              onPress={() => run('vote', picked)}
            />
          )}
        </View>
      ) : (
        <View style={styles.results}>
          {body.options.map((option) => (
            <View key={option.id} style={styles.result}>
              <View style={styles.resultHead}>
                <Text style={[styles.subhead, styles.shrink, { color: tone.text }]}>{option.text}</Text>
                <Text style={[styles.caption, { color: tone.muted }]}>{t('messenger:card.votes', { n: option.count })} · {Math.round(option.percent)}%</Text>
              </View>
              <View style={[styles.track, { backgroundColor: tone.overlay }]}>
                <View style={[styles.trackFill(option.percent), { backgroundColor: tone.accent }]} />
              </View>
              {option.voters.length > 0 && (
                <View style={styles.voters}>
                  {option.voters.map((userid) => <Voter key={userid} userid={userid} />)}
                </View>
              )}
            </View>
          ))}
        </View>
      )}
      {run && body.own && body.active && (
        <View style={styles.actions}>
          <ActionButton label={t('messenger:card.resend')} tone={tone} busy={busy} confirm={t('messenger:card.resendConfirm')} onPress={() => run('again')} />
          <ActionButton label={t('messenger:card.endVote')} tone={tone} busy={busy} confirm={t('messenger:card.endVoteConfirm')} destructive onPress={() => run('finish')} />
        </View>
      )}
    </View>
  );
}

function Voter({ userid }: { userid: number }) {
  const { theme } = useUnistyles();
  const user = useUser(userid);
  return <UserAvatar uri={user?.userimg} userid={userid} name={user?.nickname ?? ''} bot={!!user?.bot} size={theme.size.avatar.xs} />;
}

/** 卡片按钮：请求中转圈；带 confirm 的先弹系统确认框 */
function ActionButton({ label, tone, filled, busy, disabled, confirm, destructive, onPress }: {
  label: string; tone: BubbleTone; filled?: boolean; busy: boolean; disabled?: boolean; confirm?: string; destructive?: boolean; onPress: () => void;
}) {
  const { theme } = useUnistyles();
  const color = filled ? theme.palette.onTile : disabled ? tone.muted : tone.text;
  const style = ({ pressed }: { pressed: boolean }) => [styles.button, { backgroundColor: filled ? tone.accent : tone.overlay }, pressed && styles.pressed];
  const content = busy ? <ActivityIndicator size="small" color={color} /> : <Text style={[styles.subhead, { color }]}>{label}</Text>;
  if (confirm && !busy) return <Confirm title={confirm} destructive={destructive} onConfirm={onPress} style={style}>{content}</Confirm>;
  return (
    <Touchable accessibilityRole="button" disabled={disabled || busy} onPress={onPress} style={style}>
      {content}
    </Touchable>
  );
}

/** 接龙：名单较长时先收起中间，点开看全部 */
function ChainCard({ body, tone }: { body: Body<'wordChain'>; tone: BubbleTone }) {
  const t = useT();
  const join = useCardOpen();
  const [expanded, setExpanded] = useState(false);
  const { ref, expect, settle } = useKeepTop();
  useLayoutEffect(() => settle(), [settle, expanded]);
  const fold = !expanded && body.entries.length > CHAIN_FOLD;
  return (
    <View ref={ref} testID="card-word-chain" style={styles.card}>
      <CardLabel tone={tone} text={t('messenger:wordChain.tag')} />
      <RichBlocks blocks={body.blocks} tone={tone} />
      {!!body.example && <Text style={[styles.subhead, { color: tone.muted }]}>{t('messenger:wordChain.example')} {body.example}</Text>}
      {(fold ? body.entries.slice(0, CHAIN_FOLD_SHOW) : body.entries).map((entry, index) => (
        <Text key={entry.id} style={[styles.subhead, { color: tone.text }]}>{index + 1}. {entry.text}</Text>
      ))}
      {fold && (
        <Text
          accessibilityRole="button"
          onPress={() => {
            expect();
            setExpanded(true);
          }}
          style={[styles.subhead, { color: tone.link }]}
        >
          ...{t('messenger:card.expand')}...
        </Text>
      )}
      <Touchable accessibilityRole="button" onPress={join} style={({ pressed }) => [styles.chainButton, { backgroundColor: tone.overlay }, pressed && styles.pressed]}>
        <Text style={[styles.subhead, { color: tone.text }]}>{t('messenger:card.joinChain')}</Text>
      </Touchable>
    </View>
  );
}

function CardLabel({ icon, text, tone }: { icon?: LucideIcon; text: string; tone: BubbleTone }) {
  const { theme } = useUnistyles();
  return (
    <View style={styles.label}>
      {icon && <Icon icon={icon} color={tone.accent} size={theme.size.card.appIcon} />}
      <Text style={[styles.caption, { color: tone.accent }]}>{text}</Text>
    </View>
  );
}

/** 左侧色块图标 + 标题 / 副标题（位置、会议） */
function IconCard({ icon, color, title, subtitle, tone }: { icon: LucideIcon; color: string; title: string; subtitle?: string; tone: BubbleTone }) {
  const { theme } = useUnistyles();
  return (
    <View style={styles.iconCard}>
      <View style={[styles.iconTile, { backgroundColor: color }]}>
        <Icon icon={icon} color={theme.palette.onTile} size={theme.size.icon} />
      </View>
      <View style={styles.iconText}>
        <Text style={[styles.callout, { color: tone.text }]} numberOfLines={2}>{title}</Text>
        {!!subtitle && <Text style={[styles.caption, { color: tone.muted }]} numberOfLines={2}>{subtitle}</Text>}
      </View>
    </View>
  );
}

/** 会议：主题与状态，下面创建人、频道 ID 各一行；进行中再给个「加入会议」按钮 */
function MeetingCard({ body, tone }: { body: Body<'meeting'>; tone: BubbleTone }) {
  const t = useT();
  const { theme } = useUnistyles();
  const creator = useUser(body.creatorId);
  const name = creator?.nickname ?? '';
  return (
    <View testID="card-meeting" style={[styles.card, styles.wide]}>
      <IconCard
        icon={Video}
        color={body.ended ? theme.palette.tile.other : theme.palette.tile.meeting}
        title={body.name}
        subtitle={t(body.ended ? 'messenger:card.meetingEnded' : 'messenger:card.inProgress')}
        tone={tone}
      />
      <View style={[styles.meetingRow, styles.meetingSection]}>
        <Text style={[styles.footnote, { color: tone.muted }]}>{t('messenger:card.creator')}</Text>
        <View style={styles.meetingCreator}>
          <UserAvatar uri={creator?.userimg} userid={body.creatorId} name={name} bot={!!creator?.bot} size={theme.size.avatar.xs} />
          <Text style={[styles.footnote, styles.shrink, { color: tone.text }]} numberOfLines={1}>{name}</Text>
        </View>
      </View>
      <View style={styles.meetingRow}>
        <Text style={[styles.footnote, { color: tone.muted }]}>{t('messenger:card.channelId')}</Text>
        <Text style={[styles.footnote, styles.tabular, { color: tone.text }]}>{channelId(body.meetingId)}</Text>
      </View>
      {!body.ended && (
        <View style={[styles.meetingJoin, styles.meetingSection, { backgroundColor: tone.overlay }]}>
          <Text style={[styles.subhead, styles.bold, { color: tone.text }]}>{t('messenger:card.joinMeeting')}</Text>
        </View>
      )}
    </View>
  );
}

/** 合并转发：标题、前几条摘要、分隔线下共几条 */
function MergeCard({ body, tone }: { body: Body<'mergeForward'>; tone: BubbleTone }) {
  const t = useT();
  return (
    <View testID="card-merge" style={styles.card}>
      <Text style={[styles.callout, styles.bold, { color: tone.text }]} numberOfLines={1}>{mergeTitleText(body.title, t)}</Text>
      <View>
        {body.lines.map((line, index) => <MergeLine key={index} userid={line.userid} preview={line.preview} tone={tone} />)}
      </View>
      <View style={[styles.divider, { backgroundColor: tone.separator }]} />
      <Text style={[styles.caption, { color: tone.muted }]}>{t('messenger:forward.total', { n: body.count })}</Text>
    </View>
  );
}

function MergeLine({ userid, preview, tone }: Body<'mergeForward'>['lines'][number] & { tone: BubbleTone }) {
  const user = useUser(userid);
  return (
    <Text style={[styles.footnote, { color: tone.muted }]} numberOfLines={1}>
      {user?.nickname ?? ''}: <PreviewText preview={preview} />
    </Text>
  );
}

const styles = StyleSheet.create((theme) => {
  const c = theme.size.card;
  const { typography, spacing, radius } = theme;
  return {
    body: typography.body,
    subhead: typography.subhead,
    caption: typography.caption,
    callout: typography.callout,
    footnote: typography.footnote,
    italic: { fontStyle: 'italic' },
    bold: { fontWeight: '600' },
    shrink: { flexShrink: 1 },
    tabular: { fontVariant: ['tabular-nums'] },
    pressed: { opacity: theme.opacity.pressedPrimary },
    card: { gap: spacing.sm, minWidth: c.appMin },
    label: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    options: { gap: spacing.xs },
    option: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.block, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
    results: { gap: spacing.md },
    result: { gap: spacing.xs },
    resultHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md },
    track: { height: c.track, borderRadius: radius.pill, overflow: 'hidden' },
    trackFill: (percent: number) => ({ height: c.track, width: `${percent}%` }),
    voters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    actions: { flexDirection: 'row', gap: spacing.sm },
    button: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: c.appButton, paddingHorizontal: spacing.md, borderRadius: radius.block },
    chainButton: { alignItems: 'center', justifyContent: 'center', minHeight: c.appButton, borderRadius: radius.block },
    divider: { height: StyleSheet.hairlineWidth },
    iconCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minWidth: c.appMin },
    iconTile: { width: theme.size.fileTile, height: theme.size.fileTile, borderRadius: radius.block, alignItems: 'center', justifyContent: 'center' },
    iconText: { flexShrink: 1, gap: 2 },
    wide: { minWidth: c.appWide },
    meetingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, minHeight: theme.size.avatar.xs },
    /** 创建人、加入按钮各自与上一块拉开一点 */
    meetingSection: { marginTop: spacing.xs },
    meetingCreator: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    meetingJoin: { alignItems: 'center', justifyContent: 'center', minHeight: c.appJoin, borderRadius: radius.block },
  };
});
