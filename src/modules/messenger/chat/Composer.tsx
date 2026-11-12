import { Check, Keyboard, Maximize2, Mic, Pencil, Reply, Send, Smile, X } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import { msgPreview } from '../../../sync/messenger/preview';
import { ChatInput } from '../../../ui/chat';
import { Icon } from '../../../ui/Icon';
import { Menu } from '../../../ui/popover';
import { Touchable } from '../../../ui/Touchable';
import { useUser } from '../hooks';
import { PreviewText } from '../PreviewText';
import { AttachButton } from './AttachButton';
import { FullEditor } from './FullEditor';
import { inputContent } from './inputContent';
import { RichBlocks } from './RichText';
import { type ComposerMode, type ComposerProps, useComposer } from './useComposer';

export type { ComposerHandle, ComposerMode, ComposerProps } from './useComposer';

/** 内容超过两行半出全屏编辑按钮（含输入框上下内边距） */
const expandHeight = (lineHeight: number, chatInput: number) => chatInput - lineHeight + lineHeight * 2.5;

/**
 * 输入栏（App）：语音、输入框、表情面板开关，右侧有字时是发送，没字时是加号（发图片、文件）。
 * 语音模式下按住说话的长条顶替输入框（输入框留着，切回来内容和光标都在）；编辑消息时没有语音。
 * 内容多了浮出全屏编辑按钮。状态和操作见 useComposer
 */
export function Composer(props: ComposerProps) {
  const { mentionSession, mode, onModeEnd, voice } = props;
  const {
    t, theme, value, selection, rich, editing, dialog, userId, controller, editor, setEditor, openEditor, closeEditor, voiceMode, leaveVoice, onVoice, emojiOpen,
    onChangeText, onSelectionChange, canSend, send, enterKey, sendMenu, tone, blocks, modeTitle,
  } = useComposer(props);

  const slop = { left: (theme.size.touch - theme.size.chatInput) / 2, right: (theme.size.touch - theme.size.chatInput) / 2 };
  // 全屏编辑按钮：内容超过两行半或带格式时，浮在左列（麦克风）或右列（编辑消息时在表情上方，带格式时没有表情就在发送上方）的上方
  const [contentHeight, setContentHeight] = useState(0);
  const expand = !!mentionSession && !voiceMode && (rich || (!!value.text && contentHeight > expandHeight(theme.typography.body.lineHeight, theme.size.chatInput)));
  const side = voice && !editing ? 'voice' : rich ? 'send' : 'emoji';
  const withExpand = (node: ReactNode) => (
    <View style={styles.side}>
      {node}
      {expand && (
        <Touchable
          accessibilityRole="button"
          accessibilityLabel={t('messenger:editor.expand')}
          hitSlop={theme.spacing.xs}
          onPress={() => openEditor()}
          style={({ pressed }) => [styles.expand, pressed && styles.pressed]}
        >
          <Icon icon={Maximize2} color={theme.colors.text2} size={theme.size.iconTiny} />
        </Touchable>
      )}
    </View>
  );
  // 编辑态是对勾（同旧版）
  const sendIcon = <Icon icon={editing ? Check : Send} color={canSend ? theme.colors.primaryText : theme.colors.text4} size={theme.size.composer.icon} />;
  return (
    <View style={styles.root}>
      {mode && <ModeBar mode={mode} onClose={onModeEnd} />}
      <View style={styles.row}>
        {voice && !editing && withExpand(
          <Touchable
            accessibilityRole="button"
            accessibilityLabel={t(voiceMode ? 'messenger:chat.keyboard' : 'messenger:record.voice')}
            hitSlop={slop}
            onPress={onVoice}
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          >
            <Icon icon={voiceMode ? Keyboard : Mic} color={theme.colors.text2} size={theme.size.composer.icon} />
          </Touchable>,
        )}
        {voiceMode && <View style={styles.voice}>{voice?.bar}</View>}
        <View style={[styles.frame(!!voice && !editing), voiceMode && styles.hidden]}>
          {blocks ? (
            // 预览里的链接、图片不单独响应，点哪里都是回到全屏编辑；超出最大高度的部分裁掉
            <Touchable accessibilityRole="button" accessibilityLabel={t('messenger:editor.expand')} onPress={() => openEditor()} style={styles.preview}>
              <View pointerEvents="none">
                <RichBlocks blocks={blocks} tone={tone} compact />
              </View>
            </Touchable>
          ) : (
            <ChatInput
              style={styles.input}
              {...inputContent(value)}
              selection={selection}
              onChangeText={onChangeText}
              onSelectionChange={onSelectionChange}
              onContentSizeChange={(event) => setContentHeight(event.nativeEvent.contentSize.height)}
              multiline
              placeholder={t('messenger:chat.placeholder')}
              placeholderTextColor={theme.colors.text4}
              accessibilityLabel={t('messenger:chat.placeholder')}
              {...enterKey}
            />
          )}
        </View>
        {!rich && (side === 'emoji' ? withExpand : (node: ReactNode) => node)(
          <Touchable
            accessibilityRole="button"
            accessibilityLabel={t(emojiOpen ? 'messenger:chat.keyboard' : 'messenger:chat.emoji')}
            hitSlop={slop}
            onPress={() => {
              leaveVoice();
              controller.togglePanel('emoji');
            }}
            style={({ pressed }) => [styles.button, styles.emoji, pressed && styles.pressed]}
          >
            <Icon icon={emojiOpen ? Keyboard : Smile} color={theme.colors.text2} size={theme.size.composer.icon} />
          </Touchable>,
        )}
        {(side === 'send' ? withExpand : (node: ReactNode) => node)(
          editing ? (
            // 编辑按原格式改，没有发送方式菜单
            <Touchable
              accessibilityRole="button"
              accessibilityLabel={t('messenger:chat.send')}
              disabled={!canSend}
              hitSlop={slop}
              onPress={() => send()}
              style={({ pressed }) => [styles.button, pressed && styles.pressed]}
            >
              {sendIcon}
            </Touchable>
          ) : canSend && !voiceMode ? (
            <Menu
              items={sendMenu}
              trigger="context"
              button
              onPress={() => send()}
              accessibilityLabel={t('messenger:chat.send')}
              hitSlop={slop}
              style={({ pressed }) => [styles.button, pressed && styles.pressed]}
            >
              {sendIcon}
            </Menu>
          ) : (
            <AttachButton hitSlop={slop} style={({ pressed }) => [styles.button, pressed && styles.pressed]} />
          ),
        )}
      </View>
      {editor && mentionSession && (
        <FullEditor
          value={editor.value}
          append={editor.append}
          title={modeTitle}
          edit={!!editing}
          dialog={dialog}
          session={mentionSession}
          userId={userId}
          onClose={closeEditor}
          onSend={(next) => {
            setEditor(null);
            send('auto', next);
          }}
        />
      )}
    </View>
  );
}

/** 回复 / 编辑条：图标、谁的哪条消息、关闭 */
function ModeBar({ mode, onClose }: { mode: NonNullable<ComposerMode>; onClose: () => void }) {
  const t = useT();
  const { theme } = useUnistyles();
  const user = useUser(mode.kind === 'reply' ? mode.msg.userid : 0);
  const preview = msgPreview(mode.msg);
  return (
    <View style={styles.bar}>
      <Icon icon={mode.kind === 'reply' ? Reply : Pencil} color={theme.colors.primaryText} size={theme.size.iconSmall} />
      <View style={styles.barText}>
        <Text style={styles.barTitle} numberOfLines={1}>
          {mode.kind === 'reply' ? t('messenger:chat.replyTo', { name: user?.nickname ?? '' }) : t('messenger:chat.editing')}
        </Text>
        {preview && (
          <Text style={styles.barPreview} numberOfLines={1}>
            <PreviewText preview={preview} />
          </Text>
        )}
      </View>
      <Touchable
        accessibilityRole="button"
        accessibilityLabel={t('messenger:chat.cancel')}
        hitSlop={theme.spacing.sm}
        onPress={onClose}
        style={({ pressed }) => [styles.barClose, pressed && styles.pressed]}
      >
        <Icon icon={X} color={theme.colors.text3} size={theme.size.iconSmall} />
      </Touchable>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: {
    backgroundColor: theme.colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.separator,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: theme.size.composer.padX,
    paddingVertical: theme.spacing.xs,
  },
  // 按钮比触控尺寸窄，图标与输入框的间距才匀称；点按范围用 hitSlop 补回
  button: {
    width: theme.size.chatInput,
    height: theme.size.touch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { marginRight: theme.size.composer.emojiGap },
  pressed: { opacity: theme.opacity.pressedIcon },
  // 左右两列：按钮贴底，全屏编辑按钮浮在上方空处，与输入框顶端对齐
  side: { alignSelf: 'stretch', justifyContent: 'flex-end' },
  expand: {
    position: 'absolute',
    top: (theme.size.touch - theme.size.chatInput) / 2 + (theme.size.chatInput - theme.size.miniButton) / 2,
    alignSelf: 'center',
    width: theme.size.miniButton,
    height: theme.size.miniButton,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // leading：左边有语音按钮
  frame: (leading: boolean) => ({
    flex: 1,
    marginLeft: leading ? theme.size.composer.inputStart : theme.size.composer.inputStartBare,
    marginRight: theme.size.composer.inputEnd,
    marginVertical: (theme.size.touch - theme.size.chatInput) / 2,
    minHeight: theme.size.chatInput,
    justifyContent: 'center',
    borderRadius: theme.radius.block,
    backgroundColor: theme.colors.fill,
  }),
  // 语音条占输入框的位置，左边总有语音按钮
  voice: {
    flex: 1,
    marginLeft: theme.size.composer.inputStart,
    marginRight: theme.size.composer.inputEnd,
    marginVertical: (theme.size.touch - theme.size.chatInput) / 2,
  },
  hidden: { display: 'none' },
  input: {
    ...theme.typography.body,
    color: theme.colors.text,
    // 一行时上下内边距让框正好 chatInput 高；最多显示 8 行，超出框内滚动
    paddingVertical: (theme.size.chatInput - theme.typography.body.lineHeight) / 2,
    paddingHorizontal: theme.spacing.md,
    maxHeight: theme.typography.body.lineHeight * 8 + (theme.size.chatInput - theme.typography.body.lineHeight),
    // 输入框有底色就够了，不画浏览器自带的焦点框
    outlineStyle: 'solid',
    outlineWidth: 0,
  },
  preview: {
    paddingVertical: (theme.size.chatInput - theme.typography.body.lineHeight) / 2,
    paddingHorizontal: theme.spacing.md,
    maxHeight: theme.typography.body.lineHeight * 8 + (theme.size.chatInput - theme.typography.body.lineHeight),
    overflow: 'hidden',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingLeft: theme.spacing.md,
    paddingRight: theme.spacing.xs,
    paddingTop: theme.spacing.sm,
  },
  barText: { flex: 1, borderLeftWidth: 2, borderLeftColor: theme.colors.primary, paddingLeft: theme.spacing.sm },
  barTitle: { ...theme.typography.footnote, color: theme.colors.primaryText },
  barPreview: { ...theme.typography.footnote, color: theme.colors.text3 },
  barClose: { padding: theme.spacing.xs },
}));
