import { useCallback, useEffect, useRef, useState } from 'react';

import { createAiRuns } from '../../../sync/ai/runs';
import { isActive } from '../../../sync/ai/timeline';
import type { ModelOption } from '../../../sync/ai/models';
import { assistantApi } from '../../../sync/api';
import type { AssistantMessage } from '../../../sync/api/assistant';
import { showToast } from '../../../ui/Toast';
import { api, socket, useErrorText, useSession } from '../../session';
import { openSse } from '../streamTransport';

export function useAiCompose(dialogId: number, system: string, locale: string) {
  const errorText = useErrorText();
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [conversationId, setConversationId] = useState<number>();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const alive = useRef(true);
  const version = useRef(0);
  const pending = useRef(false);
  const [stream] = useState(() => {
    let settled = () => {};
    const runs = createAiRuns({ open: openSse, origin: () => useSession.getState().server, eventsUrl: (id) => assistantApi.assistantRunStream(api, id), onSettled: () => settled() });
    return { runs, setOnSettled: (callback: () => void) => { settled = callback; } };
  });
  const { runs } = stream;
  const refresh = useCallback(async () => {
    if (!conversationId || pending.current) return;
    const own = version.current;
    try {
      const result = await assistantApi.conversationMessages(api, conversationId);
      if (alive.current && own === version.current && !pending.current) {
        setMessages((previous) => [...previous.filter((message) => message.id > 0 && message.id < (result.messages[0]?.id ?? 0)), ...result.messages, ...previous.filter((message) => message.id < 0)]);
        setHasMore(!!result.has_more);
      }
    } catch (err) { if (alive.current) showToast(errorText(err)); }
  }, [conversationId, errorText]);
  useEffect(() => {
    stream.setOnSettled(() => void refresh());
    return () => stream.setOnSettled(() => {});
  }, [stream, refresh]);
  useEffect(() => {
    alive.current = true;
    const own = version.current;
    assistantApi.conversationOpen(api, String(dialogId)).then((result) => {
      if (alive.current && own === version.current) {
        setConversationId(result.conversation?.id);
        setMessages(result.messages);
        setHasMore(!!result.has_more);
      }
    }).catch((err) => { if (alive.current) showToast(errorText(err)); }).finally(() => { if (alive.current) setLoading(false); });
    return () => { alive.current = false; runs.stop(); };
  }, [dialogId, runs, errorText]);
  const activeIds = messages.filter((message) => message.id > 0 && message.role === 'assistant' && isActive(message.status)).map((message) => message.id).join(',');
  useEffect(() => {
    const releases = activeIds ? activeIds.split(',').map((id) => runs.watch(Number(id))) : [];
    return () => releases.forEach((release) => release());
  }, [activeIds, runs]);
  useEffect(() => socket.on<{ conversation_id?: number }>('aiAssistant', (event) => {
    if (event.data?.conversation_id === conversationId) void refresh();
  }), [conversationId, refresh]);
  const busy = loading || sending || !!activeIds;
  const submit = useCallback(async (model: ModelOption, text: string, images: string[], retry?: AssistantMessage) => {
    if (pending.current || busy) return;
    pending.current = true;
    const own = ++version.current;
    const localId = -own * 2;
    const user: AssistantMessage = retry ?? { id: localId, conversation_id: conversationId ?? 0, role: 'user', parts: [{ type: 'text', text }, ...images.map((path) => ({ type: 'image' as const, path }))], status: 'done' };
    const placeholder: AssistantMessage = { id: localId - 1, conversation_id: conversationId ?? 0, role: 'assistant', parts: [], status: 'queued', model: model.value };
    setSending(true);
    setMessages((prev) => retry ? [...prev.slice(0, prev.findIndex((message) => message.id === retry.id)), user, placeholder] : [...prev, user, placeholder]);
    try {
      const params = { model_type: model.type, model_name: model.value, system, locale };
      const result = retry && retry.id > 0
        ? await assistantApi.regenerate(api, { ...params, message_id: retry.id })
        : await assistantApi.sendCompose(api, { ...params, conversation_id: conversationId, scope_ref: String(dialogId), text, images });
      if (!alive.current || own !== version.current) return;
      setConversationId(result.conversation.id);
      setMessages((prev) => [...prev.slice(0, -2), result.user_message, result.message]);
    } catch (err) {
      if (alive.current && own === version.current) {
        const error = errorText(err);
        setMessages((prev) => prev.map((message) => message.id === placeholder.id ? { ...message, status: 'error', error } : message));
        showToast(error);
      }
    } finally {
      pending.current = false;
      if (alive.current) setSending(false);
    }
  }, [busy, conversationId, dialogId, errorText, locale, system]);
  const loadMore = async () => {
    if (!conversationId || loadingMore || !hasMore || !messages[0] || messages[0].id < 0) return;
    setLoadingMore(true);
    const own = version.current;
    try {
      const result = await assistantApi.conversationMessages(api, conversationId, messages[0].id);
      if (alive.current && own === version.current) {
        setMessages((prev) => [...result.messages.filter((row) => !prev.some((message) => message.id === row.id)), ...prev]);
        setHasMore(!!result.has_more);
      }
    } catch (err) { showToast(errorText(err)); }
    finally { if (alive.current) setLoadingMore(false); }
  };
  const reset = () => {
    if (busy) return;
    version.current++;
    runs.stop();
    setConversationId(undefined);
    setMessages([]);
    setHasMore(false);
  };
  const feedback = useCallback(async (message: AssistantMessage, value: 'like' | 'dislike') => {
    try {
      const updated = await assistantApi.feedback(api, message.id, message.feedback === value ? '' : value);
      if (alive.current) setMessages((prev) => prev.map((row) => row.id === updated.id ? updated : row));
    } catch (err) { showToast(errorText(err)); }
  }, [errorText]);
  return { messages, busy, loading, runs, submit, reset, feedback, loadMore, loadingMore };
}
