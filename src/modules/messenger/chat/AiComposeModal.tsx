import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { ArrowUp, Copy, ImageIcon, Plus, RotateCw, Sparkles, ThumbsDown, ThumbsUp, X } from 'lucide-react-native';
import { memo, useCallback, useMemo, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useStore } from 'zustand';

import { LANGUAGES, useLanguage, useT } from '../../../i18n';
import { fileIO, pickMedia } from '../../../platform/files';
import { buildComposeSystem, composeTurns, partsText, type ComposeTurn } from '../../../sync/ai/compose';
import { modelLabel, pickModelId, type ModelConfig } from '../../../sync/ai/models';
import type { AiRuns } from '../../../sync/ai/runs';
import { aiBody, isActive } from '../../../sync/ai/timeline';
import { assistantApi } from '../../../sync/api';
import type { AssistantMessage } from '../../../sync/api/assistant';
import type { Msg } from '../../../sync/api/dialog';
import { htmlToCompose } from '../../../sync/messenger';
import { textBlocks } from '../../../sync/messenger/body';
import { markdownToHtml } from '../../../sync/messenger/body/markdown';
import { msgPreview } from '../../../sync/messenger/preview';
import { kv, KV_KEYS } from '../../../sync/storage';
import { DooModal } from '../../../ui/DooModal';
import { Icon } from '../../../ui/Icon';
import { Popover, Tooltip } from '../../../ui/popover';
import { showToast } from '../../../ui/Toast';
import { Touchable } from '../../../ui/Touchable';
import { api, useErrorText, useSession } from '../../session';
import { useDialog, useMessenger } from '../hooks';
import { useMessengerInstance } from '../service';
import { AiBodyView } from './AiBody';
import { bubbleTones } from './bubbleTones';
import type { ComposeValue } from '../../../sync/messenger';
import { useAiCompose } from './useAiCompose';

export function AiComposeModal({ dialogId, config, draft, quote, onClose, onApply }: { dialogId: number; config: ModelConfig; draft: string; quote?: Msg; onClose: () => void; onApply: (value: ComposeValue) => void }) {
  const t = useT();
  const { theme } = useUnistyles();
  const errorText = useErrorText();
  const locale = useLanguage();
  const dialog = useDialog(dialogId);
  const messenger = useMessenger();
  const [system] = useState(() => {
    const current = useSession.getState().user;
    const users = useMessengerInstance.getState().users?.store.getState().users ?? {};
    const nickname = (id: number) => id === current?.userid ? current.nickname : users[id]?.nickname ?? '';
    const recent = (messenger?.store.getState().windows[dialogId]?.list ?? []).slice(0, 15).reverse().map((message) => ({ sender: nickname(message.userid), summary: msgPreview(message)?.text ?? '' }));
    const quoteText = quote ? `${nickname(quote.userid)}：${msgPreview(quote)?.text ?? ''}` : undefined;
    return buildComposeSystem({ language: LANGUAGES.find((item) => item.code === locale)!.name, name: dialog?.name ?? '', type: dialog?.type ?? 'user', category: dialog?.group_type, members: [nickname(dialog?.dialog_user?.userid ?? 0), ...recent.map((item) => item.sender), current?.nickname ?? ''], recent, quote: quoteText, draft });
  });
  const state = useAiCompose(dialogId, system, locale);
  const [modelId, setModelId] = useState(() => pickModelId(config, '', kv.getString(KV_KEYS.aiComposeModel)));
  const [text, setText] = useState('');
  /** 输入框随内容增高（同旧版 autosize，最高 inputMax）；清空后回到一行 */
  const [inputHeight, setInputHeight] = useState(0);
  const [images, setImages] = useState<{ path: string; url: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const output = useRef<ComponentRef<typeof ScrollView>>(null);
  const latestOutput = useRef<number | undefined>(undefined);
  const model = config.map[modelId];
  const turns = useMemo(() => composeTurns(state.messages), [state.messages]);
  const upload = async () => {
    if (uploading || state.busy) return;
    setUploading(true);
    try {
      const files = await pickMedia();
      const result = await Promise.all(files.map(async (file) => {
        try {
          if (!file.mimeType.startsWith('image/')) return null;
          return await assistantApi.upload(api, `data:${file.mimeType};base64,${await fileIO.base64(file)}`);
        } finally { fileIO.release(file); }
      }));
      setImages((prev) => [...prev, ...result.filter((item) => item !== null)]);
    } catch (err) { showToast(errorText(err)); }
    finally { setUploading(false); }
  };
  const send = async () => {
    if (!model) return showToast(t('messenger:ai.selectModel'));
    if (state.busy || uploading || (!text.trim() && !images.length)) return;
    const prompt = text.trim();
    const files = images.map((image) => image.path);
    setText('');
    setImages([]);
    await state.submit(model, prompt, files);
  };
  const apply = useCallback((value: string) => {
    if (!value.trim()) return showToast(t('messenger:ai.noContent'));
    onClose();
    onApply(htmlToCompose(markdownToHtml(value)));
  }, [onApply, onClose, t]);
  const { submit, feedback } = state;
  const retry = useCallback((user: AssistantMessage) => {
    if (model) void submit(model, partsText(user.parts), user.parts.filter((part) => part.type === 'image').flatMap((part) => part.path ? [part.path] : []), user);
  }, [model, submit]);
  return (
    // 同旧版：没有对话时窄一些（440），有对话后 600；高度随内容增长，对话区超过上限后自己滚动
    <DooModal visible onClose={onClose} bare avoidKeyboard width={state.messages.length ? theme.size.aiCompose.width : theme.size.aiCompose.widthEmpty} top={theme.size.aiCompose.top} testID="ai-compose-modal">
      <View style={styles.header}>
        <Icon icon={Sparkles} size={theme.size.aiCompose.icon} color={theme.colors.titleText} />
        <Text style={styles.title}>{t('messenger:ai.composeTitle')}</Text>
        <Tooltip label={t('messenger:ai.newCompose')}><Touchable accessibilityLabel={t('messenger:ai.newCompose')} disabled={state.busy || uploading} onPress={() => { state.reset(); setImages([]); }} style={styles.new}>
          <Icon icon={Plus} size={theme.size.aiCompose.icon} color={theme.colors.regularText} />
        </Touchable></Tooltip>
      </View>
      <View style={styles.content}>
      {turns.length > 0 && <ScrollView ref={output} style={styles.output} contentContainerStyle={styles.outputContent} onContentSizeChange={() => {
        const latest = state.messages.at(-1)?.id;
        if (latestOutput.current !== latest || state.busy) output.current?.scrollToEnd({ animated: false });
        latestOutput.current = latest;
      }} onScroll={({ nativeEvent }) => { if (nativeEvent.contentOffset.y <= theme.spacing.sm) void state.loadMore(); }} scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled">
        {state.loadingMore && <ActivityIndicator color={theme.colors.aiCompose.spinner} />}
        {turns.map((turn, index) => <ComposeReply key={turn.user.id} turn={turn} first={index === 0} config={config} runs={state.runs} onApply={apply} busy={state.busy || uploading}
          onRetry={retry} onFeedback={feedback} />)}
      </ScrollView>}
      <View style={styles.input}>
        {images.length > 0 && <ScrollView horizontal contentContainerStyle={styles.images}>{images.map((image, index) => <Touchable key={`${image.path}:${index}`} accessibilityLabel={t('messenger:ai.removeImage')} onPress={() => setImages((prev) => prev.filter((_, position) => position !== index))}>
          <Image source={image.url} style={styles.image} /><View style={styles.imageClose}><Icon icon={X} size={theme.size.aiCompose.sendIcon} color={theme.colors.regularText} /></View>
        </Touchable>)}</ScrollView>}
        <TextInput multiline value={text} onChangeText={setText} placeholder={t('messenger:ai.composePlaceholder')} placeholderTextColor={theme.colors.aiCompose.placeholder} onContentSizeChange={(event) => setInputHeight(event.nativeEvent.contentSize.height)} style={styles.textarea(text ? inputHeight : 0)} />
        <View style={styles.footer}>
          <Popover accessibilityLabel={t('messenger:ai.selectModel')} side="top" align="start" panelStyle={styles.models} content={(close) => <ScrollView style={styles.modelOptions} keyboardShouldPersistTaps="handled">
            {config.groups.map((group) => <View key={group.type}><Text style={styles.group}>{group.label}</Text>{group.options.map((option) => <Touchable key={option.id} accessibilityRole="menuitem" onPress={() => { setModelId(option.id); kv.set(KV_KEYS.aiComposeModel, option.id); close(); }} style={({ hovered }) => styles.modelRow(hovered)}>
              <Text style={styles.modelOption(option.id === modelId)}>{option.label}</Text>
            </Touchable>)}</View>)}
          </ScrollView>}><Text style={styles.modelSelect} numberOfLines={1}>{model?.label || t('messenger:ai.selectModel')}</Text></Popover>
          <View style={styles.spacer} />
          <Touchable disabled={state.busy || uploading} accessibilityLabel={t('messenger:ai.uploadImage')} onPress={() => void upload()}>{uploading ? <ActivityIndicator size="small" /> : <Icon icon={ImageIcon} size={theme.size.aiCompose.icon} color={theme.colors.aiCompose.muted} />}</Touchable>
          <Touchable disabled={state.busy || uploading || (!text.trim() && !images.length)} accessibilityLabel={t('messenger:chat.send')} onPress={() => void send()} style={styles.send}>
            <Icon icon={ArrowUp} size={theme.size.aiCompose.sendIcon} color={theme.colors.onPrimary} />
          </Touchable>
        </View>
      </View>
      </View>
    </DooModal>
  );
}

const ComposeReply = memo(function ComposeReply({ turn, first, config, runs, busy, onApply, onRetry, onFeedback }: { turn: ComposeTurn; first: boolean; config: ModelConfig; runs: AiRuns; busy: boolean; onApply: (text: string) => void; onRetry: (user: AssistantMessage) => void; onFeedback: (message: AssistantMessage, value: 'like' | 'dislike') => void }) {
  const t = useT();
  const { theme } = useUnistyles();
  const origin = useSession((s) => s.server);
  const message = turn.assistant;
  const live = useStore(runs.live, (s) => message ? s[message.id] : undefined);
  const body = useMemo(() => message ? aiBody({ status: message.status, parts: message.parts.filter((part) => part.type !== 'image'), live, error: message.error ?? undefined }, '', 0, (markdown) => textBlocks(markdown, true, { userId: 0, origin: `${origin}/` })) : null, [message, live, origin]);
  const content = message ? partsText(isActive(message.status) && live?.parts.length ? live.parts : message.parts) : '';
  const failed = body?.status === 'error';
  const active = body ? isActive(body.status) : true;
  const tone = { ...bubbleTones(theme).peer, text: theme.colors.titleText, muted: theme.colors.aiCompose.muted, bodyStyle: theme.typography.aiComposeInput, paragraphGap: theme.size.aiCompose.paragraphGap };
  return (
    <View style={styles.reply(first)}>
      <View style={styles.replyHeader}>
        {!!message?.model && <Text style={styles.chip}>{modelLabel(config, message.model)}</Text>}
        <View style={styles.spacer} />
        {failed ? <View style={styles.errorRow}><Text style={styles.error}>{t('messenger:ai.sendFailed')}</Text><Touchable onPress={() => onRetry(turn.user)} disabled={busy}><Text style={styles.retry}>{t('messenger:ai.retry')}</Text></Touchable></View>
          : !active && !!content && <Touchable accessibilityLabel={t('messenger:ai.apply')} onPress={() => onApply(content)} style={({ hovered }) => styles.apply(hovered)}><Text style={styles.applyText}>{t('messenger:ai.apply')}</Text></Touchable>}
      </View>
      <Text style={styles.question}>{partsText(turn.user.parts)}</Text>
      {body && body.blocks.length > 0 ? <AiBodyView body={body} tone={tone} /> : <View style={styles.placeholder}>
        {active && <ActivityIndicator size={theme.size.aiCompose.spinner} color={theme.colors.aiCompose.spinner} />}
        <Text style={styles.placeholderText}>{failed ? message?.error || t('messenger:ai.sendFailed') : body?.status === 'cancelled' ? t('messenger:ai.stopped') : active ? t('messenger:ai.waiting') : t('messenger:ai.noContent')}</Text>
      </View>}
      {message?.status === 'done' && !!content && <View style={styles.feedback}>
        <Touchable accessibilityLabel={t('messenger:ai.copy')} onPress={() => void Clipboard.setStringAsync(content).catch(() => {})} style={({ hovered }) => styles.feedbackButton(hovered)}>{({ hovered }) => <Icon icon={Copy} size={theme.size.aiCompose.icon} color={hovered ? theme.colors.aiCompose.muted : theme.colors.aiCompose.placeholder} />}</Touchable>
        <Touchable accessibilityLabel={t('messenger:ai.helpful')} onPress={() => onFeedback(message, 'like')} style={({ hovered }) => styles.feedbackButton(hovered)}>{({ hovered }) => <Icon icon={ThumbsUp} size={theme.size.aiCompose.icon} color={message.feedback === 'like' ? theme.colors.aiCompose.model : hovered ? theme.colors.aiCompose.muted : theme.colors.aiCompose.placeholder} />}</Touchable>
        <Touchable accessibilityLabel={t('messenger:ai.unhelpful')} onPress={() => onFeedback(message, 'dislike')} style={({ hovered }) => styles.feedbackButton(hovered)}>{({ hovered }) => <Icon icon={ThumbsDown} size={theme.size.aiCompose.icon} color={message.feedback === 'dislike' ? theme.colors.aiCompose.model : hovered ? theme.colors.aiCompose.muted : theme.colors.aiCompose.placeholder} />}</Touchable>
        <Touchable disabled={busy} accessibilityLabel={t('messenger:ai.regenerate')} onPress={() => onRetry(turn.user)} style={({ hovered }) => styles.feedbackButton(hovered)}>{({ hovered }) => <Icon icon={RotateCw} size={theme.size.aiCompose.icon} color={hovered ? theme.colors.aiCompose.muted : theme.colors.aiCompose.placeholder} />}</Touchable>
        <Text style={styles.time}>{message.created_at?.slice(5, 16)}</Text>
      </View>}
    </View>
  );
});

const styles = StyleSheet.create((theme, rt) => {
  const c = theme.size.aiCompose;
  const colors = theme.colors.aiCompose;
  return {
    header: { paddingTop: c.headerTop, paddingHorizontal: c.headerX, paddingBottom: c.headerBottom, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
    title: { ...theme.typography.aiComposeTitle, color: theme.colors.titleText, flex: 1, paddingRight: c.headerPlusRight },
    new: { position: 'absolute', right: c.headerPlusRight, alignItems: 'center', justifyContent: 'center' },
    /** 对话区 + 输入区的最大高度（同旧版：窗口高减 266，窗口不超过 900 时减 136） */
    // 卡片被键盘压矮时内容区跟着缩（对话区先缩，输入区留在卡片里）
    content: { flexShrink: 1, minHeight: 0, maxHeight: rt.screen.height - (rt.screen.height <= c.shortWindow ? c.contentInsetShort : c.contentInset) },
    output: { flexGrow: 0, flexShrink: 1, minHeight: 0, backgroundColor: colors.output, marginBottom: c.gap },
    outputContent: { paddingVertical: c.outputY, paddingHorizontal: c.outputX },
    reply: (first: boolean) => ({ marginTop: first ? 0 : c.gap, paddingTop: first ? 0 : c.gap, borderTopWidth: first ? 0 : theme.size.aiHistory.line, borderTopColor: theme.colors.aiHistory.line }),
    replyHeader: { flexDirection: 'row', alignItems: 'center', minHeight: c.apply },
    chip: { ...theme.typography.aiComposeModel, color: colors.model, backgroundColor: colors.modelFill, paddingVertical: c.chipY, paddingHorizontal: c.chipX, borderRadius: c.radius },
    spacer: { flex: 1 },
    errorRow: { flexDirection: 'row', gap: theme.spacing.xs },
    error: { ...theme.typography.aiComposeInput, color: colors.error },
    retry: { ...theme.typography.aiComposeInput, color: colors.model },
    apply: (hovered: boolean) => ({ height: c.apply, paddingHorizontal: c.applyPad, justifyContent: 'center', borderWidth: theme.size.aiHistory.line, borderColor: hovered ? colors.applyHover : colors.apply, backgroundColor: hovered ? colors.applyHover : colors.apply, borderRadius: c.radius }),
    applyText: { ...theme.typography.aiComposeApply, color: theme.colors.onPrimary },
    question: { ...theme.typography.aiComposeQuestion, color: colors.muted, marginTop: theme.spacing.xs, marginBottom: c.gap },
    placeholder: { marginTop: c.gap, paddingVertical: c.placeholderY, paddingHorizontal: c.placeholderX, backgroundColor: colors.placeholderFill, borderRadius: c.feedbackRadius, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
    placeholderText: { ...theme.typography.aiComposePlaceholder, color: colors.placeholder, flex: 1 },
    feedback: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: rt.breakpoint === 'xs' ? c.feedbackGapNarrow : c.feedbackGap, marginTop: c.feedbackTop },
    feedbackButton: (hovered: boolean) => ({ width: c.apply, height: c.apply, borderRadius: c.feedbackRadius, justifyContent: 'center', alignItems: 'center', backgroundColor: hovered ? theme.colors.bubbleOverlay : undefined }),
    time: { ...theme.typography.aiComposeTime, color: theme.colors.msgTime, marginLeft: c.timeGap },
    input: { paddingTop: c.inputTop, paddingHorizontal: c.inputX, paddingBottom: c.inputBottom, gap: c.gap },
    textarea: (content: number) => ({ ...theme.typography.aiComposeInput, color: theme.colors.titleText, padding: 0, height: Math.min(Math.max(content, theme.typography.aiComposeInput.lineHeight), c.inputMax) }),
    footer: { height: c.footer, flexDirection: 'row', alignItems: 'center', gap: c.gap },
    modelSelect: { ...theme.typography.aiComposeSelect, color: theme.colors.regularText, maxWidth: c.selectWidth },
    send: { width: c.footer, height: c.footer, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.pill, backgroundColor: colors.apply },
    models: { width: c.selectWidth, paddingVertical: c.selectPadY, paddingHorizontal: 0, borderRadius: c.radius, backgroundColor: theme.colors.surface, boxShadow: theme.shadow.menu },
    modelOptions: { maxHeight: c.selectMax },
    group: { ...theme.typography.aiComposeSelect, color: colors.placeholder, paddingLeft: c.selectGroupX, height: c.selectRow },
    modelRow: (hovered: boolean) => ({ minHeight: c.selectRow, paddingHorizontal: c.selectX, backgroundColor: hovered ? theme.colors.menuHover : undefined }),
    modelOption: (selected: boolean) => ({ ...theme.typography.aiComposeSelect, color: selected ? colors.apply : theme.colors.regularText }),
    images: { gap: theme.spacing.sm },
    image: { width: c.image, height: c.image, borderRadius: c.radius },
    imageClose: { position: 'absolute', top: 0, right: 0, backgroundColor: theme.colors.surface, borderRadius: c.radius },
  };
});
