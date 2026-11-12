import { AtSign, CirclePlus, FileText, Hash, ImageIcon, type LucideIcon, Maximize2, Mic, SendHorizontal, Smile, X } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useT } from '../../../i18n';
import { isAiBotDialog, type MentionChar } from '../../../sync/messenger';
import { msgPreview } from '../../../sync/messenger/preview';
import { ChatInput } from '../../../ui/chat';
import { Icon } from '../../../ui/Icon';
import { Menu, Popover, Tooltip } from '../../../ui/popover';
import { Touchable } from '../../../ui/Touchable';
import { useUser } from '../hooks';
import { PreviewText } from '../PreviewText';
import { EmojiPanel } from './EmojiPanel';
import { FullEditor } from './FullEditor';
import { inputContent } from './inputContent';
import { RichBlocks } from './RichText';
import { type ComposerMode, type ComposerProps, useComposer } from './useComposer';

export type { ComposerHandle, ComposerMode, ComposerProps } from './useComposer';

/** ⊕ 菜单里投票、接龙等入口的顺序（同旧版）：电话在图片前，匿名、接龙、投票在文件后 */
const BEFORE_MEDIA = ['call'];
const AFTER_FILE = ['anon', 'wordChain', 'vote', 'ai'];

/**
 * 输入栏（Web，照旧版网页）：圆角输入框里左边是编辑区，右下是工具条（表情、@、#、⊕、绿色圆形的发送）。
 * 表情宽屏是浮层、窄屏是输入栏下方的面板；⊕ 里有发图片、文件、投票等和全屏输入；
 * 没字时发送键是长按录音，有字时点按发送、右键选发送方式。回复 / 编辑条在输入框里、编辑区上方
 */
export function Composer(props: ComposerProps) {
  const { mentionSession, mode, onModeEnd, attach, extras, voice, onStickerSearch } = props;
  const {
    t, theme, value, selection, editing, dialog, userId, server, controller, editor, setEditor, openEditor, closeEditor,
    insert, sendEmoticon, onChangeText, onSelectionChange, canSend, send, enterKey, sendMenu, tone, blocks, modeTitle,
  } = useComposer(props);
  const { rt } = useUnistyles();
  const narrow = rt.breakpoint === 'xs';
  const icon = theme.size.webComposer.toolIcon;

  // 点 @ / # 先插入符号并聚焦，候选浮层随之弹出（同旧版）
  const mention = (char: MentionChar) => {
    insert(char);
    controller.focusInput();
  };
  const byKey = new Map(extras.map((extra) => [extra.key, extra]));
  const pick = (keys: string[]) => keys.flatMap((key) => byKey.get(key) ?? []).map(({ icon: itemIcon, label, onPress }) => ({ icon: itemIcon, label, onPress }));
  const moreItems: MoreItem[] = [
    ...pick(BEFORE_MEDIA),
    ...(dialog && isAiBotDialog(dialog) ? [] : [{ icon: ImageIcon, label: t('messenger:chat.sendImage'), onPress: () => attach.pick('media') }]),
    { icon: FileText, label: t('messenger:chat.uploadFile'), onPress: () => attach.pick('file') },
    ...pick(AFTER_FILE),
    ...(mentionSession ? [{ icon: Maximize2, label: t('messenger:chat.fullInput'), onPress: () => openEditor() }] : []),
  ];
  const emojiIcon = <Icon icon={Smile} color={theme.colors.regularText} size={icon} />;
  const sendCircle = (glyph: LucideIcon) => (
    <>
      <View style={styles.sendCircle} />
      <Icon icon={glyph} color={theme.colors.onPrimary} size={theme.size.webComposer.sendIcon} />
    </>
  );

  return (
    <View testID="composer" style={styles.footer}>
      <View testID="composer-wrapper" style={styles.wrapper}>
        {mode && <QuoteBar mode={mode} onClose={onModeEnd} />}
        <View style={styles.row}>
          <View style={styles.editor}>
            {blocks ? (
              // 带格式的内容只读预览，点了回到全屏输入
              <Touchable accessibilityRole="button" accessibilityLabel={t('messenger:chat.fullInput')} onPress={() => openEditor()} style={styles.preview}>
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
                multiline
                placeholder={t('messenger:chat.placeholder')}
                placeholderTextColor={theme.colors.webPlaceholder}
                accessibilityLabel={t('messenger:chat.placeholder')}
                {...enterKey}
              />
            )}
          </View>
          <View testID="composer-toolbar" style={styles.toolbar}>
            {narrow ? (
              <Tool label={t('messenger:chat.emoji')} onPress={() => controller.togglePanel('emoji')}>{emojiIcon}</Tool>
            ) : (
              <Tooltip label={t('messenger:chat.emoji')} side="top">
                <Popover
                  accessibilityLabel={t('messenger:chat.emoji')}
                  side="top"
                  align="center"
                  gap={theme.size.webComposer.popGap}
                  panelStyle={styles.pop}
                  style={styles.tool}
                  content={(close) => (
                    <EmojiPanel
                      origin={`${server}/`}
                      onInsert={(emoji) => {
                        close();
                        insert(emoji);
                        controller.focusInput();
                      }}
                      onDelete={() => undefined}
                      onSend={(item) => {
                        close();
                        sendEmoticon(item, false);
                      }}
                      onSearch={() => {
                        close();
                        onStickerSearch();
                      }}
                    />
                  )}
                >
                  {emojiIcon}
                </Popover>
              </Tooltip>
            )}
            <Tool label={t('messenger:chat.selectMember')} onPress={() => mention('@')}>
              <Icon icon={AtSign} color={theme.colors.regularText} size={icon} />
            </Tool>
            <Tool label={t('messenger:chat.selectTask')} onPress={() => mention('#')}>
              <Icon icon={Hash} color={theme.colors.regularText} size={icon} />
            </Tool>
            <Tooltip label={t('messenger:chat.more')} side="top">
              <Popover
                accessibilityLabel={t('messenger:chat.more')}
                side="top"
                align="center"
                gap={theme.size.webComposer.popGap}
                panelStyle={[styles.pop, styles.morePop]}
                style={styles.tool}
                content={(close) => <MoreList items={moreItems} onClose={close} />}
              >
                <Icon icon={CirclePlus} color={theme.colors.regularText} size={icon} />
              </Popover>
            </Tooltip>
            {canSend ? (
              // 编辑按原格式改，没有发送方式菜单
              <Tooltip label={t('messenger:chat.send')} side="top">
                {editing ? (
                  <Touchable accessibilityRole="button" accessibilityLabel={t('messenger:chat.send')} onPress={() => send()} style={styles.send}>
                    {sendCircle(SendHorizontal)}
                  </Touchable>
                ) : (
                  <Menu
                    items={sendMenu}
                    trigger="context"
                    button
                    onPress={() => send()}
                    accessibilityLabel={t('messenger:chat.send')}
                    placement={{ side: 'top', align: 'center' }}
                    look="element"
                    style={styles.send}
                  >
                    {sendCircle(SendHorizontal)}
                  </Menu>
                )}
              </Tooltip>
            ) : (
              <Tooltip label={t('messenger:chat.longPressRecord')} side="top">
                <Touchable
                  accessibilityRole="button"
                  accessibilityLabel={t('messenger:chat.longPressRecord')}
                  disabled={!voice || !!editing}
                  onLongPress={() => voice?.start()}
                  style={styles.send}
                >
                  {sendCircle(Mic)}
                </Touchable>
              </Tooltip>
            )}
          </View>
        </View>
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

/** 工具条上的图标按钮，悬停出提示 */
function Tool({ label, onPress, children }: { label: string; onPress: () => void; children: ReactNode }) {
  return (
    <Tooltip label={label} side="top">
      <Touchable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.tool}>
        {children}
      </Touchable>
    </Tooltip>
  );
}

interface MoreItem {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
}

/** ⊕ 浮层：图标 + 文字的竖排列表，悬停浅蓝底 */
function MoreList({ items, onClose }: { items: MoreItem[]; onClose: () => void }) {
  const { theme } = useUnistyles();
  return (
    <View testID="composer-more">
      {items.map((item) => (
        <Touchable
          key={item.label}
          accessibilityRole="menuitem"
          onPress={() => {
            onClose();
            item.onPress();
          }}
          style={({ hovered }) => styles.moreItem(hovered)}
        >
          <Icon icon={item.icon} color={theme.colors.regularText} size={theme.size.webComposer.moreIcon} />
          <Text style={styles.moreLabel} numberOfLines={1}>{item.label}</Text>
        </Touchable>
      ))}
    </View>
  );
}

/** 输入框里的回复 / 编辑条：左侧绿竖线，第一行是对方名字或“编辑消息”，下面最多两行原文，右边关闭 */
function QuoteBar({ mode, onClose }: { mode: NonNullable<ComposerMode>; onClose: () => void }) {
  const t = useT();
  const { theme } = useUnistyles();
  const user = useUser(mode.kind === 'reply' ? mode.msg.userid : 0);
  const preview = msgPreview(mode.msg);
  return (
    <View testID="composer-quote" style={styles.quote}>
      <View style={styles.quoteLine} />
      <Text style={styles.quoteName} numberOfLines={1}>
        {mode.kind === 'reply' ? (user?.nickname ?? '') : t('messenger:chat.editing')}
      </Text>
      {preview && (
        <Text style={styles.quoteDesc} numberOfLines={2}>
          <PreviewText preview={preview} />
        </Text>
      )}
      <Touchable accessibilityRole="button" accessibilityLabel={t('messenger:chat.cancel')} onPress={onClose} style={styles.quoteClose}>
        <Icon icon={X} color={theme.colors.regularText} size={theme.size.webComposer.quoteCloseIcon} />
      </Touchable>
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => {
  const c = theme.size.webComposer;
  const narrow = rt.breakpoint === 'xs';
  const text = narrow ? theme.typography.webInputNarrow : theme.typography.webInput;
  return {
    footer: narrow
      ? { paddingHorizontal: c.padXNarrow, paddingVertical: c.padYNarrow, backgroundColor: theme.colors.webFooterNarrow }
      : { paddingHorizontal: c.padX, marginBottom: c.bottom },
    wrapper: {
      paddingVertical: c.padY,
      paddingHorizontal: c.padX2,
      borderRadius: c.radius,
      backgroundColor: narrow ? theme.colors.surface : theme.colors.webInput,
    },
    row: { flexDirection: 'row', alignItems: 'flex-end' },
    editor: { flex: 1, minWidth: 0 },
    input: {
      ...text,
      color: narrow ? theme.colors.titleText : theme.colors.regularText,
      marginVertical: c.editorY,
      marginHorizontal: c.editorX,
      padding: 0,
      maxHeight: c.editorMax,
      outlineStyle: 'solid',
      outlineWidth: 0,
    },
    preview: { marginVertical: c.editorY, marginHorizontal: c.editorX, maxHeight: c.editorMax, overflow: 'hidden' },
    toolbar: { flexDirection: 'row', alignItems: 'center' },
    tool: { width: c.tool, height: c.tool, alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
    send: { width: c.send, height: c.tool, alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
    // 绿圆比按钮高，超出部分压在输入框内边距上
    sendCircle: {
      position: 'absolute',
      top: (c.tool - c.sendCircle) / 2,
      left: (c.send - c.sendCircle) / 2,
      width: c.sendCircle,
      height: c.sendCircle,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.primary,
    },
    pop: { borderRadius: theme.radius.menu, boxShadow: theme.shadow.menu },
    morePop: { minWidth: c.moreMin + c.morePad * 2, padding: c.morePad },
    moreItem: (hovered: boolean) => ({
      flexDirection: 'row',
      alignItems: 'center',
      height: c.moreRow,
      paddingHorizontal: c.moreItemPad,
      gap: c.moreIconGap,
      borderRadius: theme.radius.menu,
      backgroundColor: hovered ? theme.colors.webMenuHover : undefined,
      cursor: 'pointer',
    }),
    moreLabel: { ...theme.typography.webInput, color: theme.colors.regularText },
    quote: { paddingLeft: c.quoteLeft, paddingRight: c.quoteRight, paddingBottom: c.quoteBottom },
    quoteLine: {
      position: 'absolute',
      left: c.quoteLineLeft,
      top: 0,
      bottom: c.quoteBottom,
      width: c.quoteLine,
      borderRadius: theme.radius.swatch,
      backgroundColor: theme.colors.msgReplyBar,
    },
    quoteName: { ...theme.typography.webQuoteName, color: theme.colors.primary },
    quoteDesc: { ...theme.typography.webQuote, color: theme.colors.regularText },
    quoteClose: {
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: c.quoteBottom,
      width: c.quoteClose,
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
    },
  };
});
