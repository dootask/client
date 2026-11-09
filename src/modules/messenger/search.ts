import { useEffect, useMemo, useState } from 'react';

import { dialogApi } from '../../sync/api';
import type { SearchItem } from '../../sync/api/dialog';
import type { StoredDialog } from '../../sync/messenger';
import { showToast } from '../../ui/Toast';
import { api, useErrorText } from '../session';
import { useMessengerState } from './hooks';
import { extraResults } from './listModel';

/** AI 机器人单聊只在上架审核时隐藏，配置接口接入前一律显示 */
export const AI_HIDDEN = false;

/** 服务端搜索的防抖（同旧前端） */
const SEARCH_DELAY = 600;

/** 搜索结果的一行：本地会话，或服务端补上的联系人、消息 */
export type SearchRow = { kind: 'dialog'; id: number } | { kind: 'result'; item: SearchItem };

export const searchRowKey = (r: SearchRow) => (r.kind === 'dialog' ? String(r.id) : `r:${r.item.id}:${r.item.search_msg_id ?? ''}`);

/**
 * 本地匹配的会话（ids，已排好）在前，停顿后补上服务端搜到的联系人和消息；没有搜索词时只有本地。
 * searching：服务端结果还没回来
 */
export function useSearchRows(ids: readonly number[], keyword: string): { rows: SearchRow[]; searching: boolean } {
  const dialogs = useMessengerState((s) => s.dialogs);
  const errorText = useErrorText();
  const [remote, setRemote] = useState<{ key: string; items: SearchItem[] } | null>(null);

  useEffect(() => {
    if (!keyword) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      dialogApi
        .search(api, keyword)
        .then((items) => !cancelled && setRemote({ key: keyword, items }))
        .catch((err) => !cancelled && showToast(errorText(err)));
    }, SEARCH_DELAY);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [keyword, errorText]);

  const rows = useMemo<SearchRow[]>(() => {
    const local = ids.map((id) => dialogs[id]).filter((d): d is StoredDialog => !!d);
    const extra = keyword && remote?.key === keyword ? extraResults(local, remote.items, AI_HIDDEN) : [];
    return [...ids.map((id) => ({ kind: 'dialog' as const, id })), ...extra.map((item) => ({ kind: 'result' as const, item }))];
  }, [ids, dialogs, keyword, remote]);

  return { rows, searching: !!keyword && remote?.key !== keyword };
}
