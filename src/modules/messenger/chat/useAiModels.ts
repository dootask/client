import { useEffect, useMemo, useState } from 'react';

import { useT } from '../../../i18n';
import { parseModelGroups } from '../../../sync/ai/models';
import { assistantApi } from '../../../sync/api';
import { showToast } from '../../../ui/Toast';
import { api, useErrorText, useSession } from '../../session';

let cached: { owner: string; data: Record<string, unknown> } | undefined;

export function useAiModels() {
  const t = useT();
  const errorText = useErrorText();
  const server = useSession((s) => s.server);
  const userId = useSession((s) => s.user?.userid ?? 0);
  const owner = `${server}|${userId}`;
  const [loaded, setLoaded] = useState(cached);
  const raw = loaded?.owner === owner ? loaded.data : cached?.owner === owner ? cached.data : undefined;
  useEffect(() => {
    if (cached?.owner === owner) return;
    let alive = true;
    assistantApi.models(api).then((data) => {
      if (alive) { cached = { owner, data }; setLoaded(cached); }
    }).catch((err) => { if (alive) showToast(errorText(err)); });
    return () => { alive = false; };
  }, [owner, errorText]);
  return useMemo(() => parseModelGroups(raw ?? {}, { zhipu: t('messenger:ai.zhipu'), qianwen: t('messenger:ai.qianwen'), wenxin: t('messenger:ai.wenxin') }), [raw, t]);
}
