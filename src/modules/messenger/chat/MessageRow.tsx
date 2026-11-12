import { memo, type ReactNode } from 'react';
import { type GestureResponderEvent, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useStore } from 'zustand';

import { useT } from '../../../i18n';
import type { Msg } from '../../../sync/api/dialog';
import { type WithdrawnMsg } from '../../../sync/messenger';
import { msgContent, type SystemLabel } from '../../../sync/messenger/body';
import { CheckMark, CircleCheck } from '../../../ui/CheckMark';
import { RowHighlight, type MessageRenderInfo } from '../../../ui/chat';
import { Touchable } from '../../../ui/Touchable';
import { PreviewText } from '../PreviewText';
import { chained, isSystemRow, type ChatRow, type RowData } from './chatModel';
import { forwardable } from './messageMenu';
import { selectCell, selectTraits } from './selectTraits';
import { SelectHandle } from './SelectHandle';
import { MsgRow, PendingRow, UploadRow } from './MsgBubble';
import { SelectCheckContext, useName, useRowContext } from './rowParts';
import { rowTraits } from './rowTraits';

/**
 * 聊天列表的一行：气泡（文字、图片、文件、语音）、系统提示、发送中 / 失败（文字、文件）、撤回占位。
 * 行组件 memo，数据没变的行不重画；行里要用的回调都在 RowContext 里，聊天页给的是稳定对象
 */

const SYSTEM_LABELS = {
  tagAdd: 'messenger:system.tagAdd',
  tagRemove: 'messenger:system.tagRemove',
  topAdd: 'messenger:system.topAdd',
  topRemove: 'messenger:system.topRemove',
  todoAdd: 'messenger:system.todoAdd',
  todoRemove: 'messenger:system.todoRemove',
  todoDone: 'messenger:system.todoDone',
  todoTarget: 'messenger:system.todoTarget',
  withdrawSelf: 'messenger:system.withdrawSelf',
} as const satisfies Record<SystemLabel, string>;

/** 列表每次重渲染都会给每行新的 info 对象，按字段比较，内容没变的行不重渲染 */
function sameInfo(prev: { info: MessageRenderInfo<RowData> }, next: { info: MessageRenderInfo<RowData> }): boolean {
  const a = prev.info;
  const b = next.info;
  return a.message === b.message && a.older === b.older && a.newer === b.newer && a.isOwn === b.isOwn;
}

export const MessageRow = memo(function MessageRow({ info }: { info: MessageRenderInfo<RowData> }) {
  const ctx = useRowContext();
  const { theme } = useUnistyles();
  const { message, older, newer } = info;
  const gap = rowGap(message, older, theme.spacing);
  // 定位高亮只盖消息本身，上下留出一样的空：取与上一条、下一条间距较小者的一半，碰不到相邻的消息
  const pad = (newer ? Math.min(gap, rowGap(newer, message, theme.spacing)) : gap) / 2;
  const data = message.data;
  return (
    <View>
      {data.kind === 'msg' && data.msg.id === ctx.newFrom && <NewMsgDivider />}
      <View style={{ paddingTop: gap }}>
        <RowHighlight style={{ top: gap - pad, bottom: -pad }} />
        {data.kind === 'msg' &&
          (isSystemRow(message) ? (
            <SystemRow msg={data.msg} />
          ) : (
            <Selectable msg={data.msg}>
              <MsgRow info={info} msg={data.msg} />
            </Selectable>
          ))}
        {data.kind === 'pending' && <PendingRow info={info} item={data.item} />}
        {data.kind === 'upload' && <UploadRow info={info} item={data.item} />}
        {data.kind === 'withdrawn' && <WithdrawnRow item={data.item} />}
      </View>
    </View>
  );
}, sameInfo);

const shiftKey = (event: GestureResponderEvent) => !!(event.nativeEvent as { shiftKey?: boolean }).shiftKey;

/**
 * 多选模式：点整行选中，消息本身不再响应点按、长按；不能转发的消息不能选，也没有勾选圈。
 * App 勾选圈在左侧单独一列；Web 在行里头像前面（经 SelectCheckContext 交给 MsgFrame）
 */
function Selectable({ msg, children }: { msg: Msg; children: ReactNode }) {
  const ctx = useRowContext();
  const { theme } = useUnistyles();
  const active = useStore(ctx.selection, (s) => s.active);
  const checked = useStore(ctx.selection, (s) => s.ids.has(msg.id));
  if (!active) return children;
  const can = forwardable(msg);
  const mark = can && (
    <SelectHandle msgId={msg.id} drag={ctx.selectDrag} style={selectCell(theme)}>
      {selectTraits.inRow ? <CircleCheck checked={checked} size={theme.size.webSelect.icon} offColor={theme.colors.selectCircle} /> : <CheckMark checked={checked} />}
    </SelectHandle>
  );
  return (
    <Touchable
      accessibilityRole="checkbox"
      aria-checked={checked} aria-disabled={!can}
      disabled={!can}
      onPress={(event) => ctx.onSelect(msg, shiftKey(event))}
      ref={(view) => {
        if (!can) return undefined;
        ctx.selectDrag.register(msg.id, view);
        return () => ctx.selectDrag.register(msg.id, null);
      }}
      style={[styles.selectRow, checked && selectTraits.highlight && styles.selectRowChecked]}
    >
      {selectTraits.inRow ? (
        <View style={styles.selectBody}>
          <SelectCheckContext.Provider value={mark}>{children}</SelectCheckContext.Provider>
        </View>
      ) : (
        <>
          {mark || <View style={selectCell(theme)} />}
          <View style={styles.selectBody}>{children}</View>
        </>
      )}
    </Touchable>
  );
}

/** 与上一条的间距：App 连续消息收紧、系统提示多留一点；Web 每条一样（同旧版） */
function rowGap(message: ChatRow, older: ChatRow | undefined, spacing: { sm: number; md: number; lg: number }): number {
  if (!rowTraits.tightChain) return spacing.lg;
  if (isSystemRow(message)) return spacing.md;
  return chained(message, older) ? 2 : spacing.sm;
}

/** 打开时第一条未读上方的分割线 */
function NewMsgDivider() {
  const t = useT();
  return (
    <View style={styles.newDivider}>
      <View style={styles.newDividerLine} />
      <Text style={styles.newDividerText}>{t('messenger:chat.newMessages')}</Text>
      <View style={styles.newDividerLine} />
    </View>
  );
}

/** 系统消息：居中一行，用户换成昵称 */
function SystemRow({ msg }: { msg: Msg }) {
  const ctx = useRowContext();
  const t = useT();
  const { body } = msgContent(msg, ctx.body);
  if (body.kind !== 'system') return null;
  return (
    <View testID="msg-system" style={styles.system}>
      <Text style={styles.systemText}>
        {body.parts.map((part, index) => {
          const space = index > 0 ? ' ' : '';
          if ('userid' in part) return <SystemUser key={index} userid={part.userid} prefix={space} />;
          if ('label' in part) return space + t(SYSTEM_LABELS[part.label]);
          // 引号同旧版：英文双引号
          if ('preview' in part) return <Text key={index}>{space}{'"'}<PreviewText preview={part.preview} />{'"'}</Text>;
          return space + part.text;
        })}
      </Text>
    </View>
  );
}

function SystemUser({ userid, prefix }: { userid: number; prefix: string }) {
  const name = useName(userid);
  return <Text style={styles.systemUser}>{prefix}{name}</Text>;
}

/** 自己刚撤回的文本：提示加「重新编辑」 */
function WithdrawnRow({ item }: { item: WithdrawnMsg }) {
  const ctx = useRowContext();
  const t = useT();
  return (
    <View style={styles.system}>
      <Text style={styles.systemText}>
        {t('messenger:system.withdrawSelf')}
        {ctx.onReEdit && (
          <>
            {'  '}
            <Text style={styles.link} onPress={() => ctx.onReEdit?.(item)}>{t('messenger:chat.reEdit')}</Text>
          </>
        )}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  selectRow: { flexDirection: 'row', alignItems: 'center' },
  selectRowChecked: { backgroundColor: theme.colors.rowHighlight },
  // 选择模式下消息本身不接收点按，整行交给外层
  selectBody: { flex: 1, pointerEvents: 'none' },
  system: rowTraits.systemChip
    ? {
        alignSelf: 'center',
        maxWidth: '80%',
        paddingVertical: theme.spacing.xs,
        paddingHorizontal: theme.spacing.sm,
        borderRadius: theme.size.msgBubbleRadius,
        backgroundColor: theme.colors.msgNotice,
      }
    : { alignSelf: 'center', maxWidth: '80%', paddingHorizontal: theme.spacing.page },
  systemText: rowTraits.systemChip
    ? { ...theme.typography.msgNotice, color: theme.colors.descText, textAlign: 'center' }
    : { ...theme.typography.caption, color: theme.colors.text3, textAlign: 'center' },
  systemUser: { color: rowTraits.systemChip ? theme.colors.descText : theme.colors.text2 },
  link: { color: theme.colors.link },
  newDivider: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingHorizontal: theme.spacing.page, paddingTop: theme.spacing.md },
  newDividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.separator },
  newDividerText: { ...theme.typography.caption, color: theme.colors.text3 },
}));
