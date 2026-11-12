import { Link2, X } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import type { Msg } from '../../../sync/api/dialog';
import type { MsgBody } from '../../../sync/messenger/body';
import type { MsgFilterType } from '../../../sync/messenger/rules';
import { Icon } from '../../../ui/Icon';
import { Touchable } from '../../../ui/Touchable';
import { formatBytes } from '../chat/bytes';
import { openMsgFile, useFileProgress } from '../chat/fileActions';
import { fileKind } from '../chat/MessageBody';
import { useOpenHref } from '../chat/openHref';
import { PreviewText } from '../PreviewText';
import { firstHref, resultPreview } from './contentModel';

export interface ContentRowProps {
  msg: Msg;
  body: MsgBody;
  type: MsgFilterType;
  /** 发送时间（已格式化） */
  date: string;
  /** 这一条开启新的月份时是月份标题，否则为空 */
  month: string;
  onLocate: () => void;
  /** 回复（标注的「回复」） */
  onReply: () => void;
}

/**
 * 聊天内容的一条（App，同旧版 App DialogMediaScreen）：按月分组的列表行，左侧图标、两行标题、一行说明。
 * 文件是按类型着色的色块（下载中自下而上填充），链接说明是网址；点文件打开、点链接打开网址，其余回到原文
 */
export function ContentRow({ msg, body, type, date, month, onLocate }: ContentRowProps) {
  const t = useT();
  const { theme } = useUnistyles();
  const openHref = useOpenHref();
  const href = type === 'link' ? firstHref(body) : undefined;
  const file = body.kind === 'file' ? body : null;
  const onPress = () => {
    if (file) openMsgFile(msg, file, t);
    else if (href) openHref(href);
    else onLocate();
  };
  return (
    <>
      {!!month && <Text style={styles.month}>{month}</Text>}
      <Touchable testID={`content-row-${msg.id}`} accessibilityRole={href ? 'link' : 'button'} onPress={onPress} style={({ pressed }) => styles.row(pressed)}>
        {file ? <FileTile msgId={msg.id} ext={file.ext} /> : type === 'link' && (
          <View style={[styles.tile, styles.linkTile]}>
            <Icon icon={Link2} color={theme.colors.text2} size={theme.size.icon} />
          </View>
        )}
        <View style={styles.main}>
          <Text style={styles.title} numberOfLines={2}>{file ? file.name : <PreviewText preview={resultPreview(msg, body)} />}</Text>
          {file ? <FileDetail msgId={msg.id} size={file.size} date={date} /> : <Text style={styles.detail} numberOfLines={1}>{href ?? date}</Text>}
        </View>
      </Touchable>
    </>
  );
}

function FileTile({ msgId, ext }: { msgId: number; ext: string }) {
  const { theme } = useUnistyles();
  const progress = useFileProgress(msgId);
  const [kind, icon] = fileKind(ext);
  return (
    <View style={[styles.tile, { backgroundColor: theme.palette.tile[kind] }]}>
      {progress !== null && <View style={[styles.tileFill, { height: `${progress * 100}%` }]} />}
      <Icon icon={progress !== null ? X : icon} color={theme.palette.onTile} size={theme.size.icon} />
    </View>
  );
}

function FileDetail({ msgId, size, date }: { msgId: number; size: number; date: string }) {
  const progress = useFileProgress(msgId);
  return <Text style={styles.detail} numberOfLines={1}>{progress !== null ? `${formatBytes(size * progress)} / ${formatBytes(size)}` : `${formatBytes(size)} · ${date}`}</Text>;
}

const styles = StyleSheet.create((theme) => ({
  month: { ...theme.typography.footnote, color: theme.colors.text3, paddingHorizontal: theme.spacing.page, paddingTop: theme.spacing.lg, paddingBottom: theme.spacing.sm },
  row: (pressed: boolean) => ({ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingLeft: theme.spacing.page, backgroundColor: pressed ? theme.colors.fillPressed : theme.colors.surface }),
  tile: { width: theme.size.fileTile, height: theme.size.fileTile, borderRadius: theme.radius.block, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  linkTile: { backgroundColor: theme.colors.fill },
  tileFill: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: theme.palette.tileProgress },
  main: { flex: 1, gap: theme.size.listLineGap, paddingRight: theme.spacing.page, paddingVertical: theme.spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.separator },
  title: { ...theme.typography.body, color: theme.colors.text },
  detail: { ...theme.typography.footnote, color: theme.colors.text3 },
}));
