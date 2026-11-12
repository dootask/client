import { Image } from 'expo-image';
import { Check, ChevronRight, Vote } from 'lucide-react-native';
import { useLayoutEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../../i18n';
import type { MsgBody, VoteBody, VoteOption } from '../../../../sync/messenger/body';
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

/** 旧版网页的卡片消息：投票、接龙、位置、会议、合并转发（模板消息另见 K1b） */
export function CardBody({ body, tone }: { body: CardMsgBody; tone: BubbleTone }) {
  switch (body.kind) {
    case 'vote':
      return <VoteCard body={body} tone={tone} />;
    case 'wordChain':
      return <ChainCard body={body} tone={tone} />;
    case 'location':
      return <LocationCard body={body} tone={tone} />;
    case 'meeting':
      return <MeetingCard body={body} tone={tone} />;
    case 'mergeForward':
      return <MergeCard body={body} />;
    case 'template':
      return <TemplateCard data={body.template} tone={tone} />;
  }
}

/** 投票：标题行（图标、投票、单选 / 多选、实名 / 匿名）、正文；没投过时选项和投票按钮，投过后看结果；发起人在进行中可再次发送、结束 */
function VoteCard({ body, tone }: { body: VoteBody; tone: BubbleTone }) {
  const t = useT();
  const { theme } = useUnistyles();
  const [picked, setPicked] = useState<string[]>([]);
  const { busy, run } = useVoteAction();
  const toggle = (id: string) => {
    setPicked((list) => {
      if (!body.multiple) return [id];
      return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
    });
  };
  const voted = body.mine.length > 0;
  return (
    <View testID="card-vote" style={styles.vote}>
      <View style={styles.voteHead}>
        <Icon icon={Vote} color={tone.card} size={theme.size.card.headIcon} />
        <Text style={[styles.voteTitle, { color: tone.card }]}>{t('messenger:label.vote')}</Text>
        <Text style={styles.voteTag}>{t(body.multiple ? 'messenger:card.multiple' : 'messenger:card.single')}</Text>
        <Text style={styles.voteTag}>{t(body.anonymous ? 'messenger:card.anonymous' : 'messenger:card.named')}</Text>
      </View>
      <RichBlocks blocks={body.blocks} tone={tone} />
      {voted ? (
        <View style={styles.results}>
          {body.options.map((option, index) => (
            <VoteResult key={option.id} option={option} anonymous={body.anonymous} last={index === body.options.length - 1} tone={tone} />
          ))}
        </View>
      ) : (
        <View style={styles.options}>
          {body.options.map((option) => (
            <VoteChoice key={option.id} text={option.text} multiple={body.multiple} on={picked.includes(option.id)} tone={tone} onPress={() => toggle(option.id)} />
          ))}
        </View>
      )}
      {!voted ? (
        <View style={styles.buttons}>
          {picked.length > 0 ? <WarningButton label={t('messenger:card.voteNow')} busy={busy} onPress={run && (() => run('vote', picked))} /> : (
            <View style={styles.greyButton}>
              <Text style={styles.greyButtonText}>{t('messenger:card.pickFirst')}</Text>
            </View>
          )}
        </View>
      ) : (
        body.own && body.active && (
          <View style={styles.buttons}>
            <WarningButton label={t('messenger:card.resend')} busy={busy} confirm={t('messenger:card.resendConfirm')} onPress={run && (() => run('again'))} />
            <WarningButton label={t('messenger:card.endVote')} busy={busy} confirm={t('messenger:card.endVoteConfirm')} onPress={run && (() => run('finish'))} />
          </View>
        )
      )}
    </View>
  );
}

/** 一个选项：单选圈或圆形复选框 + 文字（同旧版 iView） */
function VoteChoice({ text, multiple, on, tone, onPress }: { text: string; multiple: boolean; on: boolean; tone: BubbleTone; onPress: () => void }) {
  const { theme } = useUnistyles();
  return (
    <Touchable accessibilityRole={multiple ? 'checkbox' : 'radio'} accessibilityState={{ checked: on }} onPress={onPress} style={styles.option}>
      <View style={styles.radio(on, multiple)}>
        {on && (multiple ? <Icon icon={Check} color={theme.colors.onPrimary} size={theme.size.card.check} /> : <View style={styles.radioDot} />)}
      </View>
      <Text style={[styles.optionText, { color: tone.text }]}>{text}</Text>
    </Touchable>
  );
}

/** 一个选项的结果：名字、票数和百分比、进度条，实名时下面一排投票人头像 */
function VoteResult({ option, anonymous, last, tone }: { option: VoteOption; anonymous: boolean; last: boolean; tone: BubbleTone }) {
  const t = useT();
  return (
    <View style={styles.result(last)}>
      <Text style={[styles.resultTitle, { color: tone.text }]}>{option.text}</Text>
      <View style={styles.ticket}>
        <Text style={[styles.small, { color: tone.text }]}>{t('messenger:card.votes', { n: option.count })}</Text>
        <Text style={[styles.small, { color: tone.text }]}>{option.percent.toFixed(2)}%</Text>
      </View>
      <View style={styles.track}>
        <View style={styles.trackFill(option.percent)} />
      </View>
      {/* 实名投票没人投也留空头像行（同旧版） */}
      {!anonymous && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.voters}>
          {option.voters.map((userid) => <Voter key={userid} userid={userid} />)}
        </ScrollView>
      )}
    </View>
  );
}

function Voter({ userid }: { userid: number }) {
  const { theme } = useUnistyles();
  const user = useUser(userid);
  return <UserAvatar uri={user?.userimg} userid={userid} name={user?.nickname ?? ''} bot={!!user?.bot} size={theme.size.avatar.vote} />;
}

/** iView 警告色按钮：进行中转圈、不能点；confirm 是点了先弹的确认气泡（旧版是确认框） */
function WarningButton({ label, busy, confirm, onPress }: { label: string; busy: boolean; confirm?: string; onPress?: () => void }) {
  const { theme } = useUnistyles();
  const content = (
    <>
      {busy && <ActivityIndicator size={theme.size.card.spinner} color={theme.colors.onPrimary} />}
      <Text style={styles.warnButtonText} numberOfLines={1}>{label}</Text>
    </>
  );
  const style = ({ hovered }: { hovered: boolean }) => styles.warnButton(hovered && !busy);
  if (confirm && onPress && !busy) {
    return (
      <Confirm title={confirm} onConfirm={onPress} style={style}>
        {content}
      </Confirm>
    );
  }
  return (
    <Touchable accessibilityRole="button" disabled={busy} onPress={onPress} style={style}>
      {content}
    </Touchable>
  );
}

/** 接龙：正文下是示例和名单；连同示例超过 4 条时只留前两条和最后一条，第三条位置是「...展开...」；最后一行「参与接龙」 */
function ChainCard({ body, tone }: { body: Body<'wordChain'>; tone: BubbleTone }) {
  const t = useT();
  const { theme } = useUnistyles();
  const join = useCardOpen();
  const [expanded, setExpanded] = useState(false);
  const { ref, expect, settle } = useKeepTop();
  useLayoutEffect(() => settle(), [settle, expanded]);
  const fold = !expanded && body.entries.length + (body.example ? 1 : 0) > CHAIN_FOLD;
  const lastIndex = body.entries.length - 1;
  return (
    <View ref={ref} testID="card-word-chain">
      <RichBlocks blocks={body.blocks} tone={tone} />
      <View style={styles.chainList}>
        {!!body.example && (
          <Text style={[styles.chainRow, { color: tone.text }]}>{t('messenger:wordChain.example')} {body.example}</Text>
        )}
        {body.entries.map((entry, index) => {
          if (fold && index >= CHAIN_FOLD_SHOW && index !== lastIndex) {
            if (index !== CHAIN_FOLD_SHOW) return null;
            return (
              <Text
                key={entry.id}
                accessibilityRole="button"
                onPress={() => {
                  expect();
                  setExpanded(true);
                }}
                style={[styles.chainRow, { color: tone.card }]}
              >
                ...{t('messenger:card.expand')}...
              </Text>
            );
          }
          return <Text key={entry.id} style={[styles.chainRow, { color: tone.text }]}>{index + 1}. {entry.text}</Text>;
        })}
        <Touchable accessibilityRole="button" onPress={join} style={styles.chainJoin}>
          <Text style={[styles.cardText, { color: tone.card }]}>{t('messenger:card.joinChain')}</Text>
          <View style={styles.chevron}>
            <Icon icon={ChevronRight} color={tone.card} size={theme.size.card.chevron} />
          </View>
        </Touchable>
      </View>
    </View>
  );
}

/** 位置：名称一行、地址最多两行，下面铺满气泡宽的静态地图 */
function LocationCard({ body, tone }: { body: Body<'location'>; tone: BubbleTone }) {
  return (
    <View testID="card-location" style={styles.location}>
      <Text style={[styles.cardText, { color: tone.text }]} numberOfLines={1}>{body.title}</Text>
      {!!body.address && <Text style={[styles.small, styles.sub, { color: tone.text }]} numberOfLines={2}>{body.address}</Text>}
      {!!body.thumb && (
        <View style={styles.locationPreview}>
          <Image source={body.thumb} style={StyleSheet.absoluteFill} contentFit="cover" recyclingKey={body.thumb} cachePolicy="memory-disk" />
        </View>
      )}
    </View>
  );
}

/** 会议：主题、创建人、频道 ID 三段，底下一道细线后是「点击加入会议」或「会议已结束」 */
function MeetingCard({ body, tone }: { body: Body<'meeting'>; tone: BubbleTone }) {
  const t = useT();
  const { theme } = useUnistyles();
  const creator = useUser(body.creatorId);
  const color = { color: tone.text };
  return (
    <View testID="card-meeting" style={styles.meeting(body.ended)}>
      <MeetingField label={t('messenger:card.meetingName')} value={body.name} tone={tone} />
      <MeetingField label={t('messenger:card.meetingCreator')} value={creator?.nickname ?? ''} tone={tone} creator />
      <MeetingField label={t('messenger:card.channelId')} value={channelId(body.meetingId)} tone={tone} />
      <View style={styles.meetingOp(body.ended)}>
        <Text style={[styles.small, color]}>{t(body.ended ? 'messenger:card.meetingEnded' : 'messenger:card.joinMeetingTap')}</Text>
        {!body.ended && (
          <View style={styles.chevron}>
            <Icon icon={ChevronRight} color={tone.text} size={theme.size.card.chevron} />
          </View>
        )}
      </View>
    </View>
  );
}

/** 创建人在旧版是头像组件的名字，行高 16 */
function MeetingField({ label, value, tone, creator }: { label: string; value: string; tone: BubbleTone; creator?: boolean }) {
  return (
    <View style={styles.meetingField}>
      <Text style={[styles.meetingLabel, { color: tone.text }]}>{label}</Text>
      <Text style={[styles.cardText, creator && styles.meetingCreator, { color: tone.text }]}>{value}</Text>
    </View>
  );
}

/** 合并转发：浅灰卡片，标题、前几条摘要（名字:内容）、底部共几条 */
/** 合并转发卡片（旧版网页）：点标题打开详情 */
function MergeCard({ body }: { body: Body<'mergeForward'> }) {
  const t = useT();
  const open = useCardOpen();
  return (
    <Touchable testID="card-merge" style={({ hovered }) => styles.merge(hovered)}>
      <Text style={styles.mergeTitle} numberOfLines={1} onPress={open}>{mergeTitleText(body.title, t)}</Text>
      {body.lines.map((line, index) => <MergeLine key={index} userid={line.userid} preview={line.preview} />)}
      <Text style={styles.mergeFooter}>{t('messenger:forward.total', { n: body.count })}</Text>
    </Touchable>
  );
}

function MergeLine({ userid, preview }: Body<'mergeForward'>['lines'][number]) {
  const user = useUser(userid);
  return (
    <View style={styles.mergeLine}>
      <Text style={styles.mergeText} numberOfLines={1}>{user?.nickname ?? ''}</Text>
      <Text style={[styles.mergeText, styles.mergeColon]}>:</Text>
      <Text style={[styles.mergeText, styles.mergeDesc]} numberOfLines={1}>
        <PreviewText preview={preview} />
      </Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => {
  const c = theme.size.card;
  const { colors, typography } = theme;
  return {
    cardText: typography.cardText,
    small: typography.cardSmall,
    sub: { opacity: theme.opacity.cardSub },
    italic: { fontStyle: 'italic' },
    vote: { minWidth: c.voteMin, maxWidth: c.voteMax },
    voteHead: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: c.headBottom },
    voteTitle: { ...typography.cardHead, padding: c.headPad },
    voteTag: {
      ...typography.voteTag,
      color: colors.voteTag,
      backgroundColor: colors.voteTagFill,
      borderRadius: theme.radius.tag,
      paddingHorizontal: c.tagPadX,
      paddingVertical: c.tagPadY,
      marginHorizontal: c.tagGap,
    },
    options: { marginTop: c.optionsTop },
    option: { flexDirection: 'row', alignItems: 'center', minHeight: c.option, gap: c.radioGap },
    optionText: { ...typography.voteOption, flexShrink: 1 },
    radio: (on: boolean, multiple: boolean) => ({
      width: c.radio,
      height: c.radio,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: on ? colors.ivuPrimary : colors.ivuBorder,
      backgroundColor: on && multiple ? colors.ivuPrimary : colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    }),
    radioDot: { width: c.radioDot, height: c.radioDot, borderRadius: theme.radius.pill, backgroundColor: colors.ivuPrimary },
    buttons: { flexDirection: 'row', gap: c.buttonGap, paddingTop: c.buttonsTop, paddingBottom: c.buttonsBottom },
    greyButton: {
      flex: 1,
      height: c.button,
      paddingHorizontal: c.buttonPadX,
      borderRadius: theme.radius.menu,
      borderWidth: 1,
      borderColor: colors.ivuBorder,
      backgroundColor: colors.ivuGrey,
      alignItems: 'center',
      justifyContent: 'center',
    },
    greyButtonText: { ...typography.cardText, color: colors.ivuGreyText },
    warnButton: (hovered: boolean) => ({
      flex: 1,
      height: c.button,
      paddingHorizontal: c.buttonPadX,
      borderRadius: theme.radius.menu,
      borderWidth: 1,
      borderColor: hovered ? colors.ivuWarningHover : colors.ivuWarning,
      backgroundColor: hovered ? colors.ivuWarningHover : colors.ivuWarning,
      flexDirection: 'row',
      gap: theme.spacing.xs,
      alignItems: 'center',
      justifyContent: 'center',
    }),
    warnButtonText: { ...typography.cardText, color: colors.onPrimary },
    results: { marginTop: c.resultTop },
    result: (last: boolean) => ({ marginBottom: last ? c.resultLast : c.resultGap }),
    resultTitle: { ...typography.cardSmall, marginBottom: c.resultTitle },
    ticket: { flexDirection: 'row', gap: c.ticketGap },
    track: { height: c.track, borderRadius: theme.radius.pill, backgroundColor: colors.voteTrack, overflow: 'hidden' },
    trackFill: (percent: number) => ({
      height: c.track,
      width: `${percent}%`,
      borderRadius: theme.radius.pill,
      backgroundColor: percent >= 100 ? colors.ivuSuccess : colors.ivuPrimary,
    }),
    voters: { gap: c.voterGap, marginTop: c.votersTop, paddingBottom: c.votersTop },
    chainList: { marginTop: c.chainTop - c.chainGap },
    chainRow: { ...typography.cardText, marginTop: c.chainGap },
    chainJoin: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginTop: c.joinTop },
    chevron: { paddingLeft: c.chevronGap },
    location: { width: c.location, maxWidth: '100%' },
    locationPreview: {
      height: c.locationPreview,
      marginTop: theme.spacing.xs,
      marginHorizontal: -theme.size.msgBubblePad,
      marginBottom: -theme.size.msgBubblePad,
      borderBottomLeftRadius: c.locationRadius,
      borderBottomRightRadius: c.locationRadius,
      overflow: 'hidden',
    },
    meeting: (ended: boolean) => ({
      // 旧版 220 是内容宽，RN Web 的 minWidth 含内边距
      minWidth: c.meetingMin + c.meetingPadX * 2,
      paddingHorizontal: c.meetingPadX,
      paddingVertical: c.meetingPadY,
      opacity: ended ? theme.opacity.cardEnded : 1,
    }),
    meetingField: { marginBottom: c.meetingGap },
    meetingLabel: { ...typography.cardText, fontWeight: '700', paddingBottom: c.meetingLabel },
    meetingCreator: { lineHeight: c.meetingCreator },
    meetingOp: (ended: boolean) => ({
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: ended ? 'center' : 'flex-start',
      paddingTop: c.meetingOpTop,
    }),
    merge: (hovered: boolean) => ({
      minWidth: c.mergeMin,
      maxWidth: c.mergeMax,
      padding: theme.size.forward.mergePad,
      borderRadius: theme.size.forward.mergeRadius,
      backgroundColor: hovered ? colors.mergeFillHover : colors.mergeFill,
      cursor: 'pointer',
    }),
    mergeTitle: { ...typography.mergeCardTitle, color: colors.mergeTitle, marginBottom: theme.size.forward.mergeTitleBottom },
    mergeLine: { flexDirection: 'row' },
    mergeText: { ...typography.mergeItem, color: colors.mergeText, flexShrink: 0 },
    mergeColon: { marginHorizontal: c.mergeColon },
    mergeDesc: { flexShrink: 1 },
    mergeFooter: {
      ...typography.cardSmall,
      color: colors.mergeCount,
      marginTop: theme.size.forward.mergeCountTop,
      paddingTop: theme.size.forward.mergeCountTop,
      borderTopWidth: 1,
      borderTopColor: colors.mergeLine,
    },
  };
});
