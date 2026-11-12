import { ClipboardCheck, FileText, Tag } from 'lucide-react-native';
import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import type { Msg } from '../../../sync/api/dialog';
import type { MsgBody } from '../../../sync/messenger/body';
import { Icon } from '../../../ui/Icon';
import { useSplitView } from '../../../ui/layout';
import { Touchable } from '../../../ui/Touchable';
import { useSession } from '../../session';
import { bubbleTones } from '../chat/bubbleTones';
import { formatBytes } from '../chat/bytes';
import { openMsgFile, useFileProgress } from '../chat/fileActions';
import { MergeRow } from '../chat/MsgBubble';
import { useOpenHref } from '../chat/openHref';
import { useUser } from '../hooks';
import { PreviewText } from '../PreviewText';
import type { ContentRowProps } from './ContentRow';
import { firstHref, resultPreview } from './contentModel';

/** 聊天内容的一条（网页，同旧版 DialogContent）：文件卡片、链接文字，标注和事项显示原消息气泡加底部操作；不分月 */
export function ContentRow({ msg, body, type, date, onLocate, onReply }: ContentRowProps) {
  const t = useT();
  const { theme } = useUnistyles();
  const userId = useSession((s) => s.user?.userid ?? 0);
  const tagger = useUser(type === 'tag' ? msg.tag ?? 0 : 0);
  const openHref = useOpenHref();
  const tones = useMemo(() => bubbleTones(theme), [theme]);
  if (type === 'file' && body.kind === 'file') return <ContentFile msg={msg} body={body} date={date} />;
  if (type === 'link') {
    const href = firstHref(body);
    return (
      <Touchable testID={`content-row-${msg.id}`} accessibilityRole="link" onPress={() => href ? openHref(href) : onLocate()} style={styles.linkRow}>
        <Text style={styles.link}><PreviewText preview={resultPreview(msg, body)} /></Text>
        <Text style={styles.info}>{date}</Text>
      </Touchable>
    );
  }
  return (
    <View testID={`content-row-${msg.id}`} style={styles.message}>
      {/* 气泡里自带按钮（展开、参与接龙等），外层不能也是按钮（网页里 button 不能嵌套） */}
      <Touchable onPress={onLocate}>
        <View pointerEvents="none"><MergeRow msg={msg} body={body} own={msg.userid === userId} tones={tones} onOpen={onLocate} /></View>
      </Touchable>
      <View style={styles.messageFoot}>
        <Icon icon={type === 'tag' ? Tag : ClipboardCheck} size={theme.size.msgFootIcon} color={theme.colors.primary} />
        {type === 'tag' && <Text style={styles.info}>{tagger?.nickname ?? ''}</Text>}
        <Touchable accessibilityRole="button" onPress={type === 'tag' ? onReply : onLocate}><Text style={styles.link}>{t(type === 'tag' ? 'messenger:chatMedia.reply' : 'messenger:chatMedia.locate')}</Text></Touchable>
      </View>
    </View>
  );
}

function ContentFile({ msg, body, date }: { msg: Msg; body: Extract<MsgBody, { kind: 'file' }>; date: string }) {
  const t = useT();
  const { theme } = useUnistyles();
  const wide = useSplitView();
  const progress = useFileProgress(msg.id);
  return (
    <Touchable testID={`content-row-${msg.id}`} accessibilityRole="button" onPress={() => openMsgFile(msg, body, t)} style={styles.file(wide)}>
      <Icon icon={FileText} size={theme.size.fileTile} color={theme.palette.msgType.file} />
      <View style={styles.fileMain}>
        <Text style={styles.fileName} numberOfLines={1}>{body.name}</Text>
        <Text style={styles.info} numberOfLines={1}>{progress !== null ? `${formatBytes(body.size * progress)} / ${formatBytes(body.size)}` : `${formatBytes(body.size)} · ${date}`}</Text>
      </View>
    </Touchable>
  );
}

const styles = StyleSheet.create((theme) => ({
  file: (wide: boolean) => ({ width: wide ? theme.size.contentPages.fileWidth : undefined, height: theme.size.contentPages.fileHeight, marginHorizontal: wide ? theme.spacing.lg : theme.size.contentPages.fileInsetNarrow, marginBottom: theme.spacing.sm, paddingHorizontal: theme.size.contentPages.filePadX, paddingVertical: theme.size.contentPages.filePadY, borderRadius: theme.radius.tag, backgroundColor: theme.colors.surface, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }),
  fileMain: { flex: 1, minWidth: 0, gap: theme.spacing.sm },
  fileName: { ...theme.typography.contentText, color: theme.colors.titleText },
  info: { ...theme.typography.contentInfo, color: theme.colors.text3 },
  linkRow: { marginHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.sm, gap: theme.spacing.xs },
  link: { ...theme.typography.contentText, color: theme.colors.msgLink },
  message: { paddingVertical: theme.spacing.sm },
  messageFoot: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingHorizontal: theme.spacing.lg },
}));
