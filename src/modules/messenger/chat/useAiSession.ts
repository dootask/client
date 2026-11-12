import { useState } from 'react';

import { dialogApi } from '../../../sync/api';
import type { Dialog } from '../../../sync/api/dialog';
import { showToast } from '../../../ui/Toast';
import { api, useErrorText } from '../../session';
import { useMessenger } from '../hooks';

/** AI 会话的「开启新会话」和「历史会话」开关；网页放在输入框上方的胶囊条，App 放在导航栏右侧（同旧版 App） */
export function useAiSession(dialog: Dialog, onChanged: () => void) {
  const messenger = useMessenger();
  const errorText = useErrorText();
  const [history, setHistory] = useState(false);
  const [creating, setCreating] = useState(false);
  const create = async () => {
    if (creating || !messenger) return;
    setCreating(true);
    try {
      await dialogApi.sessionCreate(api, dialog.id);
      await messenger.reloadDialog(dialog.id);
      onChanged();
    } catch (err) { showToast(errorText(err)); }
    finally { setCreating(false); }
  };
  return { creating, create, history, openHistory: () => setHistory(true), closeHistory: () => setHistory(false) };
}
