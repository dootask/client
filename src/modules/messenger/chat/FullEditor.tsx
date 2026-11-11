import { Bold, ChevronDown, Italic, Link, List, ListOrdered, ListTodo, Strikethrough, TextQuote, Underline, type LucideIcon } from 'lucide-react-native';
import { useLayoutEffect, useRef, useState } from 'react';
import { Modal, Pressable, Text, type TextInputInstance, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { EditorSurface, type EditorEvent, type EditorFormats, type EditorHandle, type EditorTheme } from '../../../embed';
import { useT } from '../../../i18n';
import { composeToHtml, EMPTY_COMPOSE, type ComposeValue, type MentionSession, type StoredDialog } from '../../../sync/messenger';
import { Icon } from '../../../ui/Icon';
import { Sheet } from '../../../ui/layout';
import { TextField } from '../../../ui/TextField';
import { bottomInset, useBreakpoint } from '../../../ui/theme';
import { Touchable } from '../../../ui/Touchable';
import { BOT_COMMAND_MAX_TEXT, MentionCandidates, pickerChars, slashReplacement, type PickerQuery } from './MentionPicker';

/** 工具栏：作用于选中文字，没有选中时作用于接着输入的文字（引用、列表作用于所在行） */
const TOOLS = [
  { key: 'bold', icon: Bold, label: 'messenger:editor.bold', name: 'bold', value: true },
  { key: 'strike', icon: Strikethrough, label: 'messenger:editor.strike', name: 'strike', value: true },
  { key: 'italic', icon: Italic, label: 'messenger:editor.italic', name: 'italic', value: true },
  { key: 'underline', icon: Underline, label: 'messenger:editor.underline', name: 'underline', value: true },
  { key: 'blockquote', icon: TextQuote, label: 'messenger:editor.quote', name: 'blockquote', value: true },
  { key: 'link', icon: Link, label: 'messenger:editor.link', name: 'link', value: true },
  { key: 'ordered', icon: ListOrdered, label: 'messenger:editor.ordered', name: 'list', value: 'ordered' },
  { key: 'bullet', icon: List, label: 'messenger:editor.bullet', name: 'list', value: 'bullet' },
  { key: 'check', icon: ListTodo, label: 'messenger:editor.check', name: 'list', value: 'unchecked' },
] as const satisfies readonly { key: string; icon: LucideIcon; label: string; name: string; value: string | boolean }[];

type Tool = (typeof TOOLS)[number];

function isActive(formats: EditorFormats, tool: Tool) {
  const current = formats[tool.name];
  if (tool.key === 'check') return current === 'checked' || current === 'unchecked';
  if (tool.key === 'link') return !!current;
  return current === tool.value;
}

/**
 * 全屏编辑（带格式工具栏）：与网页输入框同一套 Quill，发出的 HTML 与网页一致。
 * 窄屏占满屏幕，中屏、宽屏是居中的大弹窗。收起时把内容交回输入栏：没有格式时变回纯文本，有格式时输入栏显示为富文本草稿
 */
export function FullEditor({ value, append, title, edit, dialog, session, userId, onClose, onSend }: {
  value: ComposeValue;
  /** 进入时追加在末尾的文字（带格式草稿上插表情、语音转文字） */
  append?: string;
  /** 回复、编辑时的标题 */
  title: string;
  /** 编辑消息：发送键显示「完成」 */
  edit: boolean;
  dialog: StoredDialog | undefined;
  session: MentionSession;
  userId: number;
  onClose: (value: ComposeValue) => void;
  onSend: (value: ComposeValue) => void;
}) {
  const t = useT();
  const { theme } = useUnistyles();
  const wide = useBreakpoint() !== 'xs';
  const editor = useRef<EditorHandle>(null);
  const content = useRef(value);
  const [canSend, setCanSend] = useState(value.text.trim().length > 0);
  const [formats, setFormats] = useState<EditorFormats>({});
  const [query, setQuery] = useState<PickerQuery | null>(null);
  const [linking, setLinking] = useState(false);

  const [init] = useState(() => ({ html: value.text.trim() ? composeToHtml(value) : '', append, placeholder: t('messenger:chat.placeholder'), chars: pickerChars(dialog) }));
  const editorTheme: EditorTheme = {
    bg: theme.colors.surface,
    text: theme.colors.text,
    secondary: theme.colors.text3,
    placeholder: theme.colors.text4,
    link: theme.colors.link,
    quote: theme.colors.text4,
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    padding: theme.spacing.lg,
  };

  const close = () => onClose(content.current);
  const send = () => {
    if (content.current.text.trim()) onSend(content.current);
  };

  // Web 按键：候选列表先处理，Ctrl / ⌘ + 回车发送
  const pickerKeys = useRef<((key: string) => boolean) | null>(null);
  const editorKeys = useRef<((key: string, mod: boolean) => boolean) | null>(null);
  useLayoutEffect(() => {
    editorKeys.current = (key, mod) => {
      if (pickerKeys.current?.(key)) return true;
      if (mod && key === 'Enter') {
        send();
        return true;
      }
      return false;
    };
  });

  const onEvent = (event: EditorEvent) => {
    switch (event.type) {
      case 'change': {
        const { html, text, mentions, plain } = event;
        content.current = !text.trim() ? EMPTY_COMPOSE : plain ? { text, mentions } : { text, mentions, html };
        setCanSend(text.trim().length > 0);
        break;
      }
      case 'state':
        setFormats(event.formats);
        break;
      case 'query': {
        const found = event.query;
        setQuery(found && { char: found.char, query: found.text, commands: found.atStart && content.current.text.length <= BOT_COMMAND_MAX_TEXT });
        break;
      }
    }
  };

  const pressTool = (tool: Tool) => {
    if (tool.key !== 'link') editor.current?.toggle(tool.name, tool.value);
    else if (isActive(formats, tool)) editor.current?.unlink();
    else setLinking(true);
  };

  const panel = (
    <View style={styles.panel(wide)}>
      <View style={styles.bar}>
        <Touchable accessibilityRole="button" accessibilityLabel={t('messenger:editor.collapse')} onPress={close} style={({ pressed, hovered }) => styles.barButton(pressed, hovered)}>
          <Icon icon={ChevronDown} color={theme.colors.text} size={theme.size.icon} />
        </Touchable>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Touchable accessibilityRole="button" disabled={!canSend} onPress={send} style={({ pressed }) => styles.send(canSend, pressed)}>
          <Text style={styles.sendText(canSend)}>{t(edit ? 'messenger:editor.done' : 'messenger:chat.send')}</Text>
        </Touchable>
      </View>
      <View style={styles.body}>
        <EditorSurface ref={editor} init={init} theme={editorTheme} onEvent={onEvent} keysRef={editorKeys} />
        <View style={styles.picker} pointerEvents="box-none">
          <MentionCandidates
            query={query}
            dialog={dialog}
            session={session}
            userId={userId}
            keysRef={pickerKeys}
            onPick={(char, item) => (char === '/' ? editor.current?.replaceQuery(slashReplacement(item)) : editor.current?.mention({ char, id: item.id, name: item.name }))}
            onDismiss={() => setQuery(null)}
          />
        </View>
      </View>
      <View style={styles.tools(wide)}>
        {TOOLS.map((tool) => {
          const active = isActive(formats, tool);
          return (
            <Touchable
              key={tool.key}
              accessibilityRole="button"
              accessibilityLabel={t(tool.label)}
              aria-selected={active}
              onPress={() => pressTool(tool)}
              style={({ pressed, hovered }) => styles.tool(active, pressed, hovered)}
            >
              <Icon icon={tool.icon} color={active ? theme.colors.primaryText : theme.colors.text2} size={theme.size.icon} />
            </Touchable>
          );
        })}
      </View>
      <LinkSheet
        visible={linking}
        onSubmit={(url) => editor.current?.link(url)}
        onClose={() => setLinking(false)}
        onHidden={() => editor.current?.focus()}
      />
    </View>
  );

  if (!wide) {
    return (
      <Modal visible animationType="slide" statusBarTranslucent navigationBarTranslucent onRequestClose={close}>
        <View style={styles.page}>{panel}</View>
      </Modal>
    );
  }
  return (
    <Modal visible transparent animationType="fade" onRequestClose={close}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel={t('messenger:editor.collapse')} />
        {panel}
      </View>
    </Modal>
  );
}

/** 插入链接：输入网址 */
function LinkSheet({ visible, onSubmit, onClose, onHidden }: { visible: boolean; onSubmit: (url: string) => void; onClose: () => void; onHidden: () => void }) {
  const t = useT();
  const inputRef = useRef<TextInputInstance>(null);
  const [url, setUrl] = useState('');
  const trimmed = url.trim();
  if (!visible && url) setUrl('');
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t('messenger:editor.insertLink')}
      confirm={{
        label: t('messenger:editor.done'),
        disabled: !trimmed,
        onPress: () => {
          onSubmit(trimmed);
          onClose();
        },
      }}
      onShow={() => inputRef.current?.focus()}
      onHidden={onHidden}
    >
      <View style={styles.sheetBody}>
        <TextField
          ref={inputRef}
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholder={t('messenger:editor.linkPlaceholder')}
          onSubmitEditing={() => {
            if (!trimmed) return;
            onSubmit(trimmed);
            onClose();
          }}
        />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  // 窄屏：整页，底部让出键盘与安全区，工具栏贴着键盘
  page: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    paddingTop: rt.insets.top,
    paddingBottom: bottomInset(rt.insets.bottom, rt.insets.ime),
  },
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.overlay,
  },
  panel: (wide: boolean) =>
    wide
      ? {
          width: theme.size.editorWidth,
          maxWidth: '92%',
          height: '80%',
          borderRadius: theme.radius.card,
          overflow: 'hidden',
          backgroundColor: theme.colors.surface,
          boxShadow: theme.shadow.popover,
        }
      : { flex: 1 },
  bar: {
    height: theme.size.navBar,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.separator,
  },
  barButton: (pressed: boolean, hovered: boolean) => ({
    width: theme.size.touch,
    height: theme.size.touch,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: pressed ? theme.opacity.pressedIcon : 1,
    backgroundColor: hovered ? theme.colors.hover : 'transparent',
  }),
  title: { ...theme.typography.title2, flex: 1, textAlign: 'center', color: theme.colors.text },
  send: (enabled: boolean, pressed: boolean) => ({
    minWidth: theme.size.touch + theme.spacing.lg,
    height: theme.size.chatInput,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: enabled ? theme.colors.primary : theme.colors.fill,
    opacity: pressed ? theme.opacity.pressedPrimary : 1,
  }),
  sendText: (enabled: boolean) => ({ ...theme.typography.subhead, fontWeight: '600', color: enabled ? theme.colors.onPrimary : theme.colors.text4 }),
  body: { flex: 1 },
  picker: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  // 窄屏按钮铺满一行；弹窗里靠左排
  tools: (wide: boolean) => ({
    flexDirection: 'row',
    justifyContent: wide ? 'flex-start' : 'space-between',
    gap: wide ? theme.spacing.xs : 0,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.separator,
  }),
  tool: (active: boolean, pressed: boolean, hovered: boolean) => ({
    width: theme.size.toolButton,
    height: theme.size.touch,
    borderRadius: theme.radius.block,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: active ? theme.colors.primarySoft : pressed ? theme.colors.fillPressed : hovered ? theme.colors.hover : 'transparent',
  }),
  sheetBody: {
    paddingHorizontal: theme.spacing.page,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.lg,
  },
}));
