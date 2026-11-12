import { Image } from 'expo-image';
import { useMemo } from 'react';
import { Linking, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useLanguage, useT, type Translate } from '../../../../i18n';
import type { TemplateData } from '../../../../sync/messenger/body';
import { Touchable } from '../../../../ui/Touchable';
import { useSession } from '../../../session';
import { formatBytes } from '../bytes';
import { fitSize } from '../media';
import { RichBlocks, type BubbleTone } from '../RichText';
import { templateBlocks } from './templateBlocks';

type Data = Record<string, unknown>;
const obj = (v: unknown): Data => (v && typeof v === 'object' ? (v as Data) : {});
const str = (v: unknown) => (v === null || v === undefined ? '' : String(v));

/**
 * 模板消息（照旧版网页 DialogView/template）：审批通知、文件下载按各自排版画，其余拼成块结构；不认识的显示「未知的消息」。
 * 审批类型、请假原因等服务器给的文字原样显示
 */
export function TemplateCard({ data, tone }: { data: TemplateData; tone: BubbleTone }) {
  switch (data.type) {
    case 'approve_reviewer':
    case 'approve_notifier':
    case 'approve_comment_notifier':
    case 'approve_submitter':
      return <ApproveCard data={data} tone={tone} />;
    case 'file_download':
      return <FileDownload data={data} tone={tone} />;
    default:
      return <TemplateBlocks data={data} tone={tone} />;
  }
}

function TemplateBlocks({ data, tone }: { data: TemplateData; tone: BubbleTone }) {
  const t = useT();
  const language = useLanguage();
  const userId = useSession((s) => s.user?.userid ?? 0);
  const server = useSession((s) => s.server);
  const blocks = useMemo(() => templateBlocks(data, t, language.startsWith('zh'), { userId, origin: `${server}/` }), [data, t, language, userId, server]);
  if (!blocks) return <Text style={[styles.text, styles.italic, { color: tone.muted }]}>{t('messenger:chat.unknown')}</Text>;
  return <RichBlocks blocks={blocks} tone={tone} />;
}

function approveTitle(msg: TemplateData, d: Data, t: Translate): string {
  const proc = str(d.proc_def_name);
  switch (msg.type) {
    case 'approve_reviewer':
      return t('messenger:template.approveReview', { a: str(d.nickname), b: proc });
    case 'approve_notifier':
      return t('messenger:template.approveCc', { a: str(d.nickname), b: proc });
    case 'approve_comment_notifier':
      return t('messenger:template.approveComment', { a: str(d.comment_nickname), b: str(d.nickname), c: proc });
    default:
      return msg.action === 'pass'
        ? t('messenger:template.approvePassed', { a: proc })
        : t('messenger:template.approveRefused', { a: proc, b: str(d.nickname) });
  }
}

function approveStatus(msg: TemplateData, t: Translate): string | null {
  const action = str(msg.action);
  const refused = action === 'refuse' ? t('messenger:template.refused') : action === 'withdraw' ? t('messenger:template.revoked') : null;
  switch (msg.type) {
    case 'approve_reviewer':
      return action === 'pass' ? t('messenger:template.agreed') : (refused ?? t('messenger:template.pending'));
    case 'approve_notifier':
      return msg.is_finished ? t('messenger:template.finished') : t('messenger:template.approving');
    case 'approve_submitter':
      return action === 'pass' ? t('messenger:template.passed') : (refused ?? t('messenger:template.processing'));
    default:
      return null;
  }
}

/** 审批通知：粗体标题；顶线下是状态、申请人、详情各项（评论通知是评论内容），有图时附缩略图 */
function ApproveCard({ data, tone }: { data: TemplateData; tone: BubbleTone }) {
  const t = useT();
  const d = obj(data.data);
  const status = approveStatus(data, t);
  const comment = data.type === 'approve_comment_notifier';
  const applicant = data.type === 'approve_submitter' ? d.start_nickname : d.nickname;
  const color = { color: tone.text };
  const field = (label: string, value: unknown, week?: unknown) =>
    str(value) ? (
      <Text style={[styles.text, styles.line, color]}>
        {label}：{str(value)}
        {str(week) ? ` (${str(week)})` : ''}
      </Text>
    ) : null;
  const lines = [
    status !== null && (
      <Text key="status" style={[styles.text, styles.line, color]}>
        {t('messenger:template.state')}：<Text style={styles.bold}>{status}</Text>
      </Text>
    ),
    <Text key="applicant" style={[styles.text, styles.line, color]}>
      {t('messenger:template.applicant')}：<Text style={{ color: tone.fill ?? tone.link }}>@{str(applicant)}</Text> {str(d.department)}
    </Text>,
  ].filter(Boolean);
  return (
    <View style={styles.approve}>
      <Text style={[styles.text, styles.bold, color]}>{approveTitle(data, d, t)}</Text>
      <View style={styles.cause}>
        {lines.map((line, index) => (index === 0 ? <View key="first" style={styles.firstLine}>{line}</View> : line))}
        <Text style={[styles.text, styles.bold, styles.label, color]}>{comment ? t('messenger:template.commentContent') : t('messenger:template.details')}</Text>
        {comment ? (
          <Text style={[styles.text, styles.line, color]}>{str(d.comment_content)}</Text>
        ) : (
          <>
            {field(t('messenger:template.type'), d.type)}
            {field(t('messenger:template.startTime'), d.start_time, d.start_day_of_week)}
            {field(t('messenger:template.endTime'), d.end_time, d.end_day_of_week)}
            {field(t('messenger:template.reason'), d.description)}
          </>
        )}
        {data.type !== 'approve_notifier' && data.type !== 'approve_submitter' && <ApproveThumb thumb={obj(d.thumb)} />}
      </View>
    </View>
  );
}

function ApproveThumb({ thumb }: { thumb: Data }) {
  const { theme } = useUnistyles();
  const url = str(thumb.url);
  if (!url) return null;
  const max = theme.size.template.thumb;
  const box = fitSize(Number(thumb.width) || max, Number(thumb.height) || max, { width: max, height: max });
  return (
    <View style={box}>
      <Image source={url} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
    </View>
  );
}

/** 文件下载（导出完成通知）：粗体标题、空行、文件名和大小，下面橙色「立即下载」新开页下载 */
function FileDownload({ data, tone }: { data: TemplateData; tone: BubbleTone }) {
  const t = useT();
  const color = { color: tone.text };
  const url = str(data.url);
  return (
    <View>
      <Text style={[styles.text, styles.bold, color]}>{str(data.title)}</Text>
      <Text style={[styles.text, color]}> </Text>
      <Text style={[styles.text, color]}>
        {t('messenger:template.fileName')}: {str(data.name)}
      </Text>
      <Text style={[styles.text, color]}>
        {t('messenger:template.fileSize')}: {formatBytes(Number(data.size) || 0)}
      </Text>
      <Touchable
        accessibilityRole="link"
        onPress={url ? () => void Linking.openURL(url) : undefined}
        style={({ hovered }) => styles.download(hovered)}
      >
        <Text style={styles.downloadText} numberOfLines={1}>{t('messenger:template.download')}</Text>
      </Touchable>
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => {
  const { colors, typography } = theme;
  const s = theme.size.template;
  return {
    text: typography.cardText,
    bold: { fontWeight: '700' },
    italic: { fontStyle: 'italic' },
    approve: { width: rt.breakpoint === 'xs' ? s.approveNarrow : s.approve, maxWidth: '100%' },
    cause: { borderTopWidth: 1, borderTopColor: colors.approveLine, marginTop: s.causeTop, paddingBottom: s.causeBottom },
    firstLine: { paddingVertical: s.firstPad },
    line: { marginBottom: s.lineGap },
    label: { marginBottom: s.labelGap, alignSelf: 'flex-start' },
    download: (hovered: boolean) => ({
      alignSelf: 'flex-start',
      marginTop: s.buttonTop,
      height: theme.size.card.button,
      paddingHorizontal: theme.size.card.buttonPadX,
      borderRadius: theme.radius.menu,
      borderWidth: 1,
      borderColor: hovered ? colors.ivuWarningHover : colors.ivuWarning,
      backgroundColor: hovered ? colors.ivuWarningHover : colors.ivuWarning,
      justifyContent: 'center',
    }),
    downloadText: { ...typography.cardText, color: colors.onPrimary },
  };
});
