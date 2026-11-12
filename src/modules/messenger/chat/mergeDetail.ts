import { useEffect, useState } from 'react';

import type { Translate } from '../../../i18n';
import type { Msg } from '../../../sync/api/dialog';
import type { MsgBody } from '../../../sync/messenger/body';
import { openMedia } from '../../media';
import { useMsgActions } from '../hooks';
import { mergeTitleText } from './cards/cardModel';
import { openMsgFile } from './fileActions';
import { openLocation } from './openLocation';
import { openLongText } from './longText';
import type { BubbleTone } from './RichText';
import { toggleVoice } from './voice';

/** 详情里的一条（MsgBubble 各端的 MergeRow）：own 是不是自己发的，onOpen 点气泡或卡片上的入口 */
export interface MergeRowProps {
  msg: Msg;
  body: MsgBody;
  own: boolean;
  tones: { own: BubbleTone; peer: BubbleTone };
  onOpen: () => void;
}

/** 打开一条合并转发的详情：msgId 是那条合并转发消息，title 是卡片标题 */
export type OpenMerge = (msgId: number, title: string) => void;

/** 合并转发里的各条消息；null 为加载中 */
export function useMergeMsgs(msgId: number, dialogId: number): { msgs: Msg[] | null; failed: boolean } {
  const actions = useMsgActions();
  const [msgs, setMsgs] = useState<Msg[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!actions) return;
    let alive = true;
    actions
      .mergeDetail(msgId, dialogId)
      .then((list) => alive && setMsgs(list))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [actions, msgId, dialogId]);
  return { msgs, failed };
}

/** 详情里点一条（同旧版 App）：图片看详情里的图、视频播放、文件打开，语音播放，位置用系统地图，嵌套的合并转发再开一层，长文进阅读页 */
export function openMergeItem(msg: Msg, body: MsgBody, open: { merge: OpenMerge; image: (url: string) => void }, t: Translate) {
  switch (body.kind) {
    case 'image':
      open.image(body.url);
      break;
    case 'video':
      openMedia({ kind: 'video', url: body.url });
      break;
    case 'file':
      openMsgFile(msg, body, t);
      break;
    case 'record':
      void toggleVoice(body.url);
      break;
    case 'location':
      void openLocation(body).catch(() => {});
      break;
    case 'mergeForward':
      open.merge(msg.id, mergeTitleText(body.title, t));
      break;
    case 'rich':
      if (body.long) openLongText(msg.id);
      break;
  }
}
