import { useCallback, useEffect, useRef, useState } from 'react';

import { dialogApi } from '../../../sync/api';
import type { Msg } from '../../../sync/api/dialog';
import type { MsgFilterType } from '../../../sync/messenger/rules';
import { api } from '../../session';
import { appendPage, earlierCursor } from './contentModel';

const PAGE_SIZE = 50;

export function useContentPage(dialogId: number, type: MsgFilterType, visible?: (msg: Msg) => boolean) {
  const [msgs, setMsgs] = useState<Msg[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const cursor = useRef(0);
  const busy = useRef(false);
  const alive = useRef(false);
  const load = useCallback((prevId: number) => {
    if (busy.current) return;
    busy.current = true;
    const requestPage = (before: number): Promise<void> => dialogApi.msgList(api, { dialog_id: dialogId, msg_type: type, take: PAGE_SIZE, ...(before ? { prev_id: before } : {}) }).then((page) => {
      if (!alive.current) return;
      cursor.current = earlierCursor(page.list);
      setMsgs((current) => appendPage(before ? current ?? [] : [], page.list));
      // 表情也会命中图片接口，整页无原图时继续找更早的图片
      if (cursor.current && visible && !page.list.some(visible)) return requestPage(cursor.current);
    });
    return requestPage(prevId).catch(() => {
      if (alive.current) setFailed(true);
    }).finally(() => {
      busy.current = false;
      if (alive.current) setLoading(false);
    });
  }, [dialogId, type, visible]);
  useEffect(() => {
    alive.current = true;
    void load(0);
    return () => { alive.current = false; };
  }, [load]);
  const loadMore = useCallback(() => {
    if (!cursor.current || failed || busy.current) return;
    setLoading(true);
    void load(cursor.current);
  }, [load, failed]);
  const retry = useCallback(() => {
    if (busy.current) return;
    setFailed(false);
    setLoading(true);
    void load(msgs ? cursor.current : 0);
  }, [load, msgs]);
  return { msgs, failed, loading, loadMore, retry };
}
