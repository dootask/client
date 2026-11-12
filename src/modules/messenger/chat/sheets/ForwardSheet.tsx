import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, Text, TextInput, type TextInputInstance, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useShallow } from 'zustand/react/shallow';

import { useT } from '../../../../i18n';
import type { Msg } from '../../../../sync/api/dialog';
import { msgPreview } from '../../../../sync/messenger/preview';
import { UserAvatar } from '../../../../ui/Avatar';
import { CircleCheck } from '../../../../ui/CheckMark';
import { DooButton, DooModal } from '../../../../ui/DooModal';
import { showToast } from '../../../../ui/Toast';
import { Touchable } from '../../../../ui/Touchable';
import { useErrorText } from '../../../session';
import { useMessengerState, useMsgActions, useUsers } from '../../hooks';
import { PreviewText } from '../../PreviewText';
import { DialogPicker } from '../../picker/DialogPicker';
import { isGroup, pickKey, pickName, type Picked } from '../../picker/pickerData';
import { PickAvatar } from '../../picker/pickerParts';
import type { ForwardSheetProps } from './forwardSheetTypes';

/** 服务端一次最多发往的会话数 */
const MAX_TARGETS = 50;

/**
 * 转发（旧版网页）：选择成员弹窗（选会话模式）点「确定」后叠一层「确认转发」，选择弹窗留在下面；
 * 确认弹窗取消回到选择，发出后两层一起关
 */
export function ForwardSheet({ dialogId, msgIds, multi = false, defaultMerge = false, visible, onClose, onSent }: ForwardSheetProps) {
  const t = useT();
  const [pending, setPending] = useState<Picked[] | null>(null);
  return (
    <>
      <DialogPicker visible={visible} title={t('messenger:action.forward')} max={MAX_TARGETS} onSubmit={setPending} onClose={onClose} />
      {visible && pending && (
        <ForwardConfirm
          dialogId={dialogId}
          msgIds={msgIds}
          multi={multi}
          defaultMerge={defaultMerge}
          recipients={pending}
          onCancel={() => setPending(null)}
          onSent={() => {
            onSent?.();
            onClose();
          }}
        />
      )}
    </>
  );
}

/**
 * 确认转发（旧版 Forwarder/confirm）：收件人头像（只有一位时带名字）；多选进来的有「逐条 / 合并」单选和预览
 * （合并是「聊天记录」卡片，前 4 条加总条数；逐条是前 10 条消息），单条转发预览这一条；
 * 「不显示原发送者信息」（合并时没有）、留言，底部「确定 (人数)」
 */
function ForwardConfirm({ dialogId, msgIds, multi, defaultMerge, recipients, onCancel, onSent }: {
  dialogId: number;
  msgIds: readonly number[];
  multi: boolean;
  defaultMerge: boolean;
  recipients: Picked[];
  onCancel: () => void;
  onSent: () => void;
}) {
  const t = useT();
  const { theme } = useUnistyles();
  const actions = useMsgActions();
  const errorText = useErrorText();
  const [merge, setMerge] = useState(multi && defaultMerge);
  const [hideSource, setHideSource] = useState(false);
  const [message, setMessage] = useState('');
  const inputRef = useRef<TextInputInstance>(null);
  const [sending, setSending] = useState(false);
  const msgs = useMessengerState(
    useShallow((s) => {
      const list = s.windows[dialogId]?.list ?? [];
      return msgIds.slice(0, merge ? 4 : 10).flatMap((id) => list.find((m) => m.id === id) ?? []);
    }),
  );

  // 留言框随内容长高（同旧版 autosize，最多三行 84，再多在框内滚动）：先收回一行再量内容高，删字时也能缩回
  useLayoutEffect(() => {
    const el = inputRef.current as unknown as HTMLTextAreaElement | null;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [message]);

  const submit = () => {
    if (!actions || sending) return;
    setSending(true);
    actions
      .forward({
        msg_ids: [...msgIds],
        merge,
        dialogids: recipients.flatMap((item) => (isGroup(item) ? [item.dialogId] : [])),
        userids: recipients.flatMap((item) => (isGroup(item) ? [] : [item.userid])),
        show_source: merge || !hideSource,
        leave_message: message.trim(),
      })
      .then(() => {
        showToast(t('messenger:forward.done'));
        onSent();
      })
      .catch((err) => {
        showToast(errorText(err));
        setSending(false);
      });
  };

  const single = recipients.length === 1;
  return (
    <DooModal
      visible
      onClose={onCancel}
      title={t('messenger:forward.confirmTitle')}
      width={theme.size.forward.width}
      headerBottom={theme.size.forward.headerBottom}
      bare
      footer={<DooButton primary label={`${t('confirm')} (${recipients.length})`} disabled={sending} onPress={submit} />}
      testID="forward-confirm"
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recipients} contentContainerStyle={styles.recipientList}>
        {recipients.map((item) => (
          <View key={pickKey(item)} style={styles.recipient}>
            <PickAvatar item={item} size={theme.size.avatar.md} />
            {single && <Text style={styles.recipientName} numberOfLines={1}>{pickName(item)}</Text>}
          </View>
        ))}
      </ScrollView>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
        {multi && (
          <View style={styles.modes} accessibilityRole="radiogroup">
            <Radio label={t('messenger:forward.oneByOne')} on={!merge} onPress={() => setMerge(false)} />
            <Radio label={t('messenger:forward.merge')} on={merge} onPress={() => setMerge(true)} />
          </View>
        )}
        {merge ? <MergePreview msgs={msgs} total={msgIds.length} /> : msgs.map((msg) => <BubblePreview key={msg.id} msg={msg} />)}
        {!merge && (
          <Touchable accessibilityRole="checkbox" aria-checked={hideSource} onPress={() => setHideSource(!hideSource)} style={styles.option}>
            <CircleCheck checked={hideSource} size={theme.size.forward.option} offColor={theme.colors.radioIcon} />
            <Text style={styles.optionText}>{t('messenger:forward.hideSource')}</Text>
          </Touchable>
        )}
        <TextInput
          ref={inputRef}
          value={message}
          onChangeText={setMessage}
          placeholder={t('messenger:forward.message')}
          placeholderTextColor={theme.colors.uspText4}
          multiline
          numberOfLines={1}
          editable={!sending}
          style={styles.input}
        />
      </ScrollView>
    </DooModal>
  );
}

/** iView 小号单选：14 的圆圈，选中主色描边加主色圆点 */
function Radio({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Touchable accessibilityRole="radio" aria-checked={on} onPress={onPress} style={styles.radio}>
      <View style={styles.radioCircle(on)}>{on && <View style={styles.radioDot} />}</View>
      <Text style={styles.radioText}>{label}</Text>
    </Touchable>
  );
}

/** 合并转发的「聊天记录」卡片：前几条的发送人（16 头像加名字）和摘要，底部总条数 */
function MergePreview({ msgs, total }: { msgs: Msg[]; total: number }) {
  const t = useT();
  const { theme } = useUnistyles();
  const userids = useMemo(() => [...new Set(msgs.map((m) => m.userid))], [msgs]);
  const users = useUsers(userids);
  return (
    <View style={styles.merge}>
      <Text style={styles.mergeTitle}>{t('messenger:forward.records')}</Text>
      {msgs.map((msg) => {
        const user = users[msg.userid];
        const preview = msgPreview(msg);
        return (
          <View key={msg.id} style={styles.mergeItem}>
            <UserAvatar uri={user?.userimg} userid={msg.userid} name={user?.nickname ?? ''} bot={!!user?.bot} size={theme.size.avatar.micro} />
            <Text style={styles.mergeText} numberOfLines={1}>
              {`${user?.nickname ?? ''} `}
              {preview && <PreviewText preview={preview} />}
            </Text>
          </View>
        );
      })}
      <Text style={styles.mergeCount}>{t('messenger:forward.total', { n: total })}</Text>
    </View>
  );
}

/** 逐条和单条转发的预览：一条灰底气泡里的消息摘要 */
function BubblePreview({ msg }: { msg: Msg }) {
  const preview = msgPreview(msg);
  return (
    <View style={styles.preview}>
      <View style={styles.bubble}>
        <Text style={styles.bubbleText} numberOfLines={3}>
          {preview && <PreviewText preview={preview} />}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => {
  const f = theme.size.forward;
  const c = theme.colors;
  return {
    recipients: { flexGrow: 0, flexShrink: 0, marginTop: f.recipientsTop, marginHorizontal: f.padX, paddingBottom: f.recipientsBottom },
    recipientList: { alignItems: 'center', gap: f.avatarGap },
    recipient: { flexDirection: 'row', alignItems: 'center', gap: f.nameGap },
    recipientName: { ...theme.typography.forwardOption, color: c.text },
    scroll: { flexShrink: 1 },
    body: { paddingHorizontal: f.padX },
    modes: { flexDirection: 'row', flexWrap: 'wrap', gap: f.modeGap, paddingBottom: f.modeBottom },
    radio: { flexDirection: 'row', alignItems: 'center', gap: f.radioGap, marginRight: f.radioItemGap },
    radioCircle: (on: boolean) => ({
      width: f.radio,
      height: f.radio,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: on ? c.ivuPrimary : c.ivuBorder,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surface,
    }),
    radioDot: { width: f.radioDot, height: f.radioDot, borderRadius: theme.radius.pill, backgroundColor: c.ivuPrimary },
    radioText: { ...theme.typography.forwardOption, color: c.regularText },
    merge: { padding: f.mergePad, marginBottom: f.mergeBottom, borderRadius: f.mergeRadius, backgroundColor: c.mergeFill },
    mergeTitle: { ...theme.typography.mergeTitle, marginBottom: f.mergeTitleBottom, color: c.mergeTitle },
    mergeItem: { flexDirection: 'row', alignItems: 'center', gap: f.mergeItemGap },
    mergeText: { ...theme.typography.mergeItem, flex: 1, color: c.mergeText },
    mergeCount: {
      ...theme.typography.mergeCount,
      marginTop: f.mergeCountTop,
      paddingTop: f.mergeCountTop,
      borderTopWidth: 1,
      borderTopColor: c.mergeLine,
      color: c.mergeCount,
    },
    preview: { paddingBottom: f.previewItemBottom },
    bubble: { padding: theme.size.msgBubblePad, borderRadius: theme.size.msgBubbleRadius, backgroundColor: c.msgBubbleIn },
    bubbleText: { ...theme.typography.msgText, paddingVertical: theme.size.msgTextPad, color: c.regularText },
    option: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: f.optionGap, marginBottom: f.optionLast },
    optionText: { ...theme.typography.forwardOption, color: c.text },
    input: {
      ...theme.typography.forwardOption,
      minHeight: f.inputMin,
      maxHeight: f.inputMax,
      marginBottom: f.inputBottom,
      paddingVertical: f.inputPadY,
      paddingHorizontal: f.inputPadX,
      borderRadius: f.inputRadius,
      backgroundColor: c.forwardInput,
      color: c.text,
      outlineStyle: 'solid',
      outlineWidth: 0,
    },
  };
});
